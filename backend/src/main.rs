#[macro_use]
extern crate rocket;
use clap::Parser;
use rocket::fs::FileServer;
use rocket::serde::{json::Json, Deserialize, Serialize};
use std::fs;
use std::process::Command;
use tempfile::TempDir;
use webhook::client::WebhookClient;
#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    /// Path to the static files
    #[clap(long, value_parser, default_value = "dist")]
    dist: String,

    /// Path to the signing CA cert
    #[clap(long, value_parser, default_value = "ca.crt")]
    ca_crt: String,

    /// Path to the signing CA cert
    #[clap(long, value_parser, default_value = "ca.key")]
    ca_key: String,

    // Webhook to send alerts of new keys being provisioned to
    #[clap(long, value_parser)]
    webhook: Option<String>,
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
struct GenerateRequest {
    client_name: String,
    ip: String,
    groups: String,
}

#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
struct GenerateResponse {
    cacrt: String,
    crt: String,
    key: String,
}

#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
struct ErrorResponse {
    message: String,
}

#[post("/api/generate", data = "<request>")]
async fn generate(
    request: Json<GenerateRequest>,
) -> Result<Json<GenerateResponse>, Json<ErrorResponse>> {
    let args = Args::parse(); // TODO: silly but easier than a rocket context for now
    let temp_dir = TempDir::new().unwrap();
    let temp_dir_path = temp_dir.path().as_os_str().to_str().unwrap();
    let out_crt = format!("{}/host.crt", temp_dir_path);
    let out_key = format!("{}/host.key", temp_dir_path);
    let res = Command::new("nebula-cert")
        .arg("sign")
        .arg("-name")
        .arg(&request.client_name)
        .arg("-ip")
        .arg(&request.ip)
        .arg("-groups")
        .arg(&request.groups)
        .arg("-out-crt")
        .arg(&out_crt)
        .arg("-out-key")
        .arg(&out_key)
        .arg("-ca-crt")
        .arg(&args.ca_crt)
        .arg("-ca-key")
        .arg(&args.ca_key)
        .output();

    match res {
        Ok(x) => {
            if !x.status.success() {
                return Err(Json(ErrorResponse {
                    message: String::from_utf8_lossy(&x.stderr).to_string(),
                }));
            }
        }
        Err(x) => {
            return Err(Json(ErrorResponse {
                message: x.to_string(),
            }));
        }
    }

    let crt: String = fs::read_to_string(&out_crt).unwrap().parse().unwrap();
    let key: String = fs::read_to_string(&out_key).unwrap().parse().unwrap();
    let cacrt: String = fs::read_to_string(&args.ca_crt).unwrap().parse().unwrap();
    temp_dir.close().unwrap();

    // Send to discord if configured
    match args.webhook {
        Some(w) => {
            let client: WebhookClient = WebhookClient::new(&w);
            let content = format!(
                "New nebula client provisioned for: {}",
                &request.client_name
            );
            let res = client
                .send(|message| message.username("nebula-admin-panel").content(&content))
                .await;

            match res {
                Ok(_) => {}
                Err(x) => {
                    println!("Could not send Discord message! {:?}", x)
                }
            }
        }
        None => {}
    }
    Ok(Json(GenerateResponse { crt, key, cacrt }))
}
#[launch]
fn rocket() -> _ {
    let args = Args::parse();
    // serve static content and the generate route
    rocket::build()
        .mount("/", FileServer::from(&args.dist))
        .mount("/", routes![generate])
}
