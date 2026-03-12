import { Elysia } from "elysia";
import { authMiddleware } from "./middlewares/auth";
import { chatRoutes } from "./routes/chat";

const app = new Elysia();
app.use(authMiddleware);
app.use(chatRoutes);

app.listen(3000);

console.log("Server running on http://localhost:3000");