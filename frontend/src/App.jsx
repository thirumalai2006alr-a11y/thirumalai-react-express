import { useState } from "react";
function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState("hey");
  const [todos, setTodos] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [text, setText] = useState("");

  // console.log(username);
  // console.log(email);
  function showMessage(text, type) {
    setMessage(text);
    setMessageType(type);
  }
  async function registerUser(e) {
    e.preventDefault();
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, confirmPassword }),
    });

    console.log(response);
    const data = await response.json();
    console.log(data.message);

    if (!response.ok) {
      showMessage(data.message, "error");
      return;
    }

    showMessage(data.message, "success");
    setPage("login");
    // console.log(username, email, password, confirmPassword);
  }

  function handleSessionExpired(response) {
    if (response.status === 401) {
      setUser(null);
      setTodos([]);
      setPage("login");
      showMessage("Session expired please login again", "error");
      return true;
    }
  }

  async function loadTodos() {
    const response = await fetch("/api/todos");
    if (handleSessionExpired(response)) {
      return;
    }

    if (!response.ok) {
      showMessage("Could not load Todos", "error");
      return;
    }

    const data = await response.json();
    console.log(data);
    setTodos(data);
    // send todos
  }

  async function addTodo(e) {
    e.preventDefault();
    console.log(text);
    const response = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    // console.log(data.message);
    showMessage(data.message, "success");
    setText("");

    loadTodos();
  }

  async function editTodo(todo) {
    const newText = prompt("Edit Todo: ", todo.text);
    // console.log(todo)
    const response = await fetch("/api/todos/" + todo._id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });
    const data = await response.json();
    // console.log(data.message);
    showMessage(data.message, "success");
    loadTodos();
  }
  async function deleteTodo(id) {
    // console.log(id);
    const response = await fetch("/api/todos/" + id, {
      method: "DELETE",
    });
    console.log(response);
    if (handleSessionExpired(response)) {
      true;
    }
    const data = await response.json();
    // console.log(data.message);
    showMessage(data.message, "success");

    loadTodos();
  }

  async function loginUser(e) {
    e.preventDefault();
    // console.log(email, password);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    // console.log(response);
    const data = await response.json();
    // console.log(data.message);
    if (!response.ok) {
      showMessage(data.message, "error");
    } else {
      showMessage(data.message, "success");
      setPage("todo");

      loadUser();
      loadTodos();
    }
    setEmail("");
    setPassword("");
  }

  async function loadUser() {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    setUser(data.username);
  }

  async function logoutUser() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });
    const data = await response.json();
    showMessage(data.message, "success");

    setUser(null);
    setTodos([]);
    setPage("login");
  }
  return (
    <main className="container">
      {/* home page section */}
      {page === "home" && (
        <section>
          <h1>Todo App</h1>
          <p>Create an account and manage your own todos.</p>

          <div className="actions">
            <button onClick={() => setPage("register")}>Register</button>
            <button className="secondary" onClick={() => setPage("login")}>
              Login
            </button>
          </div>
        </section>
      )}
      {/* Register page section */}

      {page === "register" && (
        <section>
          <h1>Create Account</h1>
          <form onSubmit={registerUser}>
            <label htmlFor="usernameInput">User Name</label>
            <input
              id="usernameInput"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label htmlFor="userEmail">Email</label>
            <input
              id="userEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button>Create Account</button>
          </form>

          <p className="link">
            Already have an Account?{" "}
            <button className="link-button" onClick={() => setPage("login")}>
              Login
            </button>
          </p>
        </section>
      )}

      {/* login section */}
      {page === "login" && (
        <section>
          <h1>Login</h1>
          <form onSubmit={loginUser}>
            <label htmlFor="loginEmail">email</label>
            <input
              id="loginEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="loginPassword">password</label>
            <input
              id="loginPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button>Login</button>
          </form>
        </section>
      )}

      {/* todo page section */}
      {page === "todo" && (
        <section>
          <div className="topbar">
            <strong>Hi {user}</strong>
            <button className="small" onClick={logoutUser}>
              Logout
            </button>
          </div>
          <h1>My Todos</h1>
          <form onSubmit={addTodo}>
            <label htmlFor="todoInput">Add New Todo</label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              id="todoInput"
              type="text"
            />
            <button>Add Todo</button>
          </form>
          <ul className="todo-list">
            {todos.length === 0 && <h2>No todos available</h2>}
            {todos.map((todo) => {
              return (
                <li key={todo._id}>
                  <span className="todo-text">{todo.text}</span>
                  <div className="todo-buttons">
                    <button
                      onClick={() => editTodo(todo)}
                      className="edit-button"
                    >
                      edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => deleteTodo(todo._id)}
                    >
                      delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {message && <p className={messageType}>{message}</p>}
    </main>
  );
}
export default App;