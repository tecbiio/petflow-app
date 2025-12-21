#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
  fs,
  net::{SocketAddr, TcpStream},
  path::{Path, PathBuf},
  process::{Child, Command, Stdio},
  sync::Mutex,
  time::{Duration, Instant},
};

use tauri::{Manager, RunEvent};

const CORE_PORT: u16 = 3000;

struct SetupError(String);

impl std::fmt::Debug for SetupError {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    f.debug_tuple("SetupError").field(&self.0).finish()
  }
}

impl std::fmt::Display for SetupError {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", self.0)
  }
}

impl std::error::Error for SetupError {}

struct CoreState(Mutex<Option<Child>>);

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let child = ensure_core_running(&app.handle()).map_err(|err| Box::new(SetupError(err)) as Box<dyn std::error::Error>)?;
      app.manage(CoreState(Mutex::new(child)));
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      if matches!(event, RunEvent::ExitRequested { .. }) {
        stop_core(app_handle);
      }
    });
}

fn stop_core(app_handle: &tauri::AppHandle) {
  let state = app_handle.state::<CoreState>();
  let mut guard = state.0.lock().expect("CoreState lock poisoned");
  if let Some(mut child) = guard.take() {
    let _ = child.kill();
    let _ = child.wait();
  }
}

fn ensure_core_running(app_handle: &tauri::AppHandle) -> Result<Option<Child>, String> {
  if is_port_open(CORE_PORT) {
    return Ok(None);
  }

  let node_bin = resolve_node_binary()?;
  let core_dir = resolve_core_dir(app_handle)?;
  let (master_db_url, tenant_db_url, auth_token_secret) = prepare_local_state(app_handle)?;

  ensure_databases(&node_bin, &core_dir, &master_db_url, &tenant_db_url)?;
  let mut child = start_core(
    &node_bin,
    &core_dir,
    &master_db_url,
    &tenant_db_url,
    &auth_token_secret,
  )?;

  if !wait_for_port(CORE_PORT, Duration::from_secs(20)) {
    let _ = child.kill();
    let _ = child.wait();
    return Err("Le service petflow-core ne répond pas sur le port 3000 (timeout).".to_string());
  }

  Ok(Some(child))
}

fn resolve_core_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
  if cfg!(debug_assertions) {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../petflow-core");
    if dir.exists() {
      return Ok(dir);
    }
    return Err(format!("petflow-core introuvable en dev (attendu: {})", dir.display()));
  }

  let resource_dir = app_handle
    .path_resolver()
    .resource_dir()
    .ok_or("Impossible de résoudre resource_dir (Tauri)")?;
  let candidates = [
    resource_dir.join("petflow-core"),
    resource_dir.join("resources").join("petflow-core"),
  ];
  candidates
    .into_iter()
    .find(|p| p.exists())
    .ok_or_else(|| "Ressource petflow-core introuvable (exécutez `npm run desktop:prepare` avant build).".to_string())
}

fn prepare_local_state(
  app_handle: &tauri::AppHandle,
) -> Result<(String, String, String), String> {
  let app_data_dir = app_handle
    .path_resolver()
    .app_data_dir()
    .ok_or("Impossible de résoudre app_data_dir (Tauri)")?;
  fs::create_dir_all(&app_data_dir).map_err(|err| format!("Création app_data_dir échouée: {err}"))?;

  let db_dir = app_data_dir.join("db");
  fs::create_dir_all(&db_dir).map_err(|err| format!("Création db_dir échouée: {err}"))?;

  let master_db_path = db_dir.join("master.db");
  let tenant_db_path = db_dir.join("dev.db");

  let auth_token_secret = load_or_create_secret(&app_data_dir)?;

  let master_db_url = sqlite_url(&master_db_path);
  let tenant_db_url = sqlite_url(&tenant_db_path);

  Ok((master_db_url, tenant_db_url, auth_token_secret))
}

fn sqlite_url(path: &Path) -> String {
  format!("file:{}", path.to_string_lossy().replace('\\', "/"))
}

fn default_stdio() -> Stdio {
  if cfg!(debug_assertions) {
    Stdio::inherit()
  } else {
    Stdio::null()
  }
}

fn load_or_create_secret(app_data_dir: &Path) -> Result<String, String> {
  let secret_path = app_data_dir.join("auth_token_secret.txt");
  if secret_path.exists() {
    return fs::read_to_string(&secret_path)
      .map(|s| s.trim().to_string())
      .map_err(|err| format!("Lecture auth_token_secret échouée: {err}"));
  }

  let mut bytes = [0u8; 32];
  getrandom::getrandom(&mut bytes).map_err(|err| format!("Génération secret échouée: {err}"))?;
  let secret = bytes.iter().map(|b| format!("{b:02x}")).collect::<String>();
  fs::write(&secret_path, &secret).map_err(|err| format!("Écriture auth_token_secret échouée: {err}"))?;
  Ok(secret)
}

fn resolve_node_binary() -> Result<PathBuf, String> {
  const ENV_KEYS: [&str; 2] = ["PETFLOW_NODE_BINARY", "PETFLOW_NODE"];
  for key in ENV_KEYS {
    if let Ok(value) = std::env::var(key) {
      let trimmed = value.trim();
      if trimmed.is_empty() {
        continue;
      }
      let path = PathBuf::from(trimmed);
      if path.exists() {
        return Ok(path);
      }
      return Err(format!(
        "{} pointe vers un binaire Node introuvable: {}",
        key,
        path.display()
      ));
    }
  }

  if is_node_available(Path::new("node")) {
    return Ok(PathBuf::from("node"));
  }

  let mut candidates: Vec<PathBuf> = Vec::new();

  if cfg!(target_os = "macos") {
    candidates.push(PathBuf::from("/opt/homebrew/bin/node"));
    candidates.push(PathBuf::from("/usr/local/bin/node"));
    candidates.push(PathBuf::from("/usr/bin/node"));
    if let Some(home) = std::env::var_os("HOME") {
      candidates.extend(find_nvm_nodes(Path::new(&home)));
    }
  } else if cfg!(target_os = "windows") {
    candidates.push(PathBuf::from(r"C:\Program Files\nodejs\node.exe"));
    candidates.push(PathBuf::from(r"C:\Program Files (x86)\nodejs\node.exe"));
    candidates.push(PathBuf::from(r"C:\ProgramData\chocolatey\bin\node.exe"));
  } else {
    candidates.push(PathBuf::from("/usr/local/bin/node"));
    candidates.push(PathBuf::from("/usr/bin/node"));
  }

  for candidate in candidates {
    if !candidate.exists() {
      continue;
    }
    if is_node_available(&candidate) {
      return Ok(candidate);
    }
  }

  Err(
    "Node.js introuvable pour démarrer le service petflow-core.\n\
Installe Node.js (ex: Homebrew) ou définis PETFLOW_NODE_BINARY=/chemin/vers/node."
      .to_string(),
  )
}

fn find_nvm_nodes(home: &Path) -> Vec<PathBuf> {
  let nvm_versions = home.join(".nvm").join("versions").join("node");
  let Ok(entries) = fs::read_dir(&nvm_versions) else {
    return vec![];
  };
  let mut nodes: Vec<PathBuf> = entries
    .filter_map(|entry| entry.ok())
    .map(|entry| entry.path().join("bin").join("node"))
    .filter(|path| path.exists())
    .collect();
  nodes.sort();
  nodes.reverse();
  nodes
}

fn is_node_available(node_bin: &Path) -> bool {
  Command::new(node_bin)
    .arg("--version")
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .status()
    .map(|status| status.success())
    .unwrap_or(false)
}

fn ensure_databases(node_bin: &Path, core_dir: &Path, master_db_url: &str, tenant_db_url: &str) -> Result<(), String> {
  let prisma_cli = core_dir.join("node_modules").join("prisma").join("build").join("index.js");
  if !prisma_cli.exists() {
    return Err(format!(
      "Prisma CLI introuvable dans le service core (attendu: {}).",
      prisma_cli.display()
    ));
  }

  let master_status = Command::new(node_bin)
    .current_dir(core_dir)
    .arg(&prisma_cli)
    .args(["db", "push", "--schema", "prisma/master.prisma", "--skip-generate"])
    .env("MASTER_DATABASE_URL", master_db_url)
    .stdout(default_stdio())
    .stderr(default_stdio())
    .status()
    .map_err(|err| format!("Prisma db push (master) échoué: {err}"))?;
  if !master_status.success() {
    return Err("Prisma db push (master) a échoué".to_string());
  }

  let tenant_status = Command::new(node_bin)
    .current_dir(core_dir)
    .arg(&prisma_cli)
    .args(["migrate", "deploy", "--schema", "prisma/schema.prisma"])
    .env("DATABASE_URL", tenant_db_url)
    .stdout(default_stdio())
    .stderr(default_stdio())
    .status()
    .map_err(|err| format!("Prisma migrate deploy (tenant) échoué: {err}"))?;
  if tenant_status.success() {
    return Ok(());
  }

  let fallback_status = Command::new(node_bin)
    .current_dir(core_dir)
    .arg(&prisma_cli)
    .args(["db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"])
    .env("DATABASE_URL", tenant_db_url)
    .stdout(default_stdio())
    .stderr(default_stdio())
    .status()
    .map_err(|err| format!("Prisma db push (tenant) échoué: {err}"))?;
  if !fallback_status.success() {
    return Err("Prisma migrate deploy/db push (tenant) a échoué".to_string());
  }
  Ok(())
}

fn start_core(
  node_bin: &Path,
  core_dir: &Path,
  master_db_url: &str,
  tenant_db_url: &str,
  auth_token_secret: &str,
) -> Result<Child, String> {
  let entry = core_dir.join("dist").join("main.js");
  if !entry.exists() {
    return Err(format!(
      "Build petflow-core introuvable (attendu: {}). Lancez `npm run build` dans petflow-core.",
      entry.display()
    ));
  }

  let admin_email = std::env::var("PETFLOW_ADMIN_EMAIL").unwrap_or_else(|_| "admin@local".to_string());
  let admin_password = std::env::var("PETFLOW_ADMIN_PASSWORD").unwrap_or_else(|_| "admin".to_string());

  Command::new(node_bin)
    .current_dir(core_dir)
    .arg(entry)
    .env("NODE_ENV", if cfg!(debug_assertions) { "development" } else { "production" })
    .env("PORT", CORE_PORT.to_string())
    .env("DESKTOP", "true")
    .env("FRONTEND_ORIGIN", "http://localhost:5173,tauri://localhost,https://tauri.localhost")
    .env("AUTH_COOKIE_SECURE", "false")
    .env("MASTER_DATABASE_URL", master_db_url)
    .env("DATABASE_URL", tenant_db_url)
    .env("AUTH_TOKEN_SECRET", auth_token_secret)
    .env("AUTH_BOOTSTRAP_USER", admin_email)
    .env("AUTH_BOOTSTRAP_PASSWORD", admin_password)
    .stdout(default_stdio())
    .stderr(default_stdio())
    .spawn()
    .map_err(|err| format!("Démarrage petflow-core échoué: {err}"))
}

fn is_port_open(port: u16) -> bool {
  let addr: SocketAddr = ([127, 0, 0, 1], port).into();
  TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok()
}

fn wait_for_port(port: u16, timeout: Duration) -> bool {
  let deadline = Instant::now() + timeout;
  while Instant::now() < deadline {
    if is_port_open(port) {
      return true;
    }
    std::thread::sleep(Duration::from_millis(200));
  }
  false
}
