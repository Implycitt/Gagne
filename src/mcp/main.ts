import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

function createServer(): McpServer {
    const server = new McpServer({ name: "gagne", version: "1.0" });
    return server;
}
