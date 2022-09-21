#[macro_use]
extern crate rocket;
use clap::Parser;
use rocket::fs::FileServer;
use rocket::serde::{json::Json, Deserialize, Serialize};
use std::fs;
use std::process::Command;
use tempfile::TempDir;

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    /// Path to the signing CA cert
    #[clap(long, value_parser, default_value = "ca.crt")]
    ca_crt: String,

    /// Path to the signing CA cert
    #[clap(long, value_parser, default_value = "ca.key")]
    ca_key: String,
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
    crt: String,
    key: String,
}

#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
struct ErrorResponse {
    message: String,
}

#[post("/api/generate", data = "<request>")]
fn generate(request: Json<GenerateRequest>) -> Result<Json<GenerateResponse>, Json<ErrorResponse>> {
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

    temp_dir.close().unwrap();

    Ok(Json(GenerateResponse { crt, key }))
}
#[launch]
fn rocket() -> _ {
    Args::parse();
    // serve static content and the generate route
    rocket::build()
        .mount("/", FileServer::from("../gui/dist"))
        .mount("/", routes![generate])
}
