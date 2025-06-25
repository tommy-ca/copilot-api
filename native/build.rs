extern crate neon_build;

fn main() {
    neon_build::setup(); // must be called in build.rs

    // Tell Cargo to rebuild if our source files change
    println!("cargo:rerun-if-changed=src/");
    println!("cargo:rerun-if-changed=Cargo.toml");
}