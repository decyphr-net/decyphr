FROM messense/rust-musl-cross:x86_64-musl as chef
ENV SQLX_OFFLINE=true
RUN sudo apt-get update -y && \
    sudo apt-get install libc6 -y && \
    sudo apt-get install libssl-dev -y && \
    sudo apt-get install -y --no-install-recommends openssl ca-certificates && \
    sudo apt-get install pkg-config -y && \
    sudo apt-get install -y musl-tools && \
    sudo apt-get install wget -y && \
    sudo apt-get install ca-certificates -y

RUN update-ca-certificates
# ------------------------------- Build OpenSSL for the `musl` build target
RUN \
    ln -s /usr/include/x86_64-linux-gnu/asm /usr/include/x86_64-linux-musl/asm && \
    ln -s /usr/include/asm-generic /usr/include/x86_64-linux-musl/asm-generic && \
    ln -s /usr/include/linux /usr/include/x86_64-linux-musl/linux

WORKDIR /musl

RUN wget https://github.com/openssl/openssl/archive/OpenSSL_1_1_1f.tar.gz
RUN tar zxvf OpenSSL_1_1_1f.tar.gz 
WORKDIR /musl/openssl-OpenSSL_1_1_1f/

RUN CC="musl-gcc -fPIE -pie" ./Configure no-shared no-async --prefix=/musl --openssldir=/musl/ssl linux-x86_64
RUN make depend
RUN make -j$(nproc)
RUN make install
# -------------------------------

RUN cargo install cargo-chef
WORKDIR /authenticator

FROM chef AS planner
# Copy source code from previous stage
COPY ./authenticator .
COPY ./infra .
# Generate info for caching dependencies
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /authenticator/recipe.json recipe.json
# Build & cache dependencies
RUN cargo chef cook --release --target x86_64-unknown-linux-musl --recipe-path recipe.json
# Copy source code from previous stage
COPY . .
# Build application
RUN cargo build --release --target x86_64-unknown-linux-musl

# Create a new stage with a minimal image
FROM scratch
COPY --from=builder /authenticator/target/x86_64-unknown-linux-musl/release/authenticator /authenticator
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY ./authenticator/settings settings

ENTRYPOINT ["./authenticator"]
EXPOSE 5000