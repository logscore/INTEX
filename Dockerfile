# Might need to adjust the build scripts for this

FROM oven/bun:1-alpine AS builder
WORKDIR /app
# Will need to adjust the paths depending on how the code is structured
COPY package.json ./
#  Not using --frozen-lock is horrible for production, but well do it anyways
RUN bun install
COPY . .
RUN bun run build

#  THis runs the built app
FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["bun", "run", "build/index.js"]
