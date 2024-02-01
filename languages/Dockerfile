FROM messense/rust-musl-cross:x86_64-musl as chef
ENV SQLX_OFFLINE=true
RUN sudo apt-get update && sudo apt-get install libc6 -y
RUN cargo install cargo-chef
WORKDIR /languages

FROM chef AS planner
# Copy source code from previous stage
COPY ./languages .
COPY ./infra .
# Generate info for caching dependencies
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /languages/recipe.json recipe.json
# Build & cache dependencies
RUN cargo chef cook --release --target x86_64-unknown-linux-musl --recipe-path recipe.json
# Copy source code from previous stage
COPY . .
# Build application
RUN cargo build --release --target x86_64-unknown-linux-musl

# Create a new stage with a minimal image
FROM scratch
COPY --from=builder /languages/target/x86_64-unknown-linux-musl/release/languages /languages

COPY languages/settings settings

ENTRYPOINT ["./languages"]
EXPOSE 5000