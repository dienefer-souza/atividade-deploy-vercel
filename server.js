const express = require("express");
const app = express();
const PORT = 3000;
const path = require("path");
const sqlite3 = require("sqlite3");
const { Sequelize, DataTypes } = require("sequelize");

// Configurações
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Usa a pasta /tmp na Vercel (única pasta com permissão de escrita na nuvem)
const dbPath = process.env.VERCEL
  ? "/tmp/database.sqlite"
  : "./database.sqlite";

const sequelize = new Sequelize({
  dialect: "sqlite",
  dialectModule: sqlite3,
  storage: dbPath,
});

const Pessoas = sequelize.define("Pessoas", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  turma: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Posts = sequelize.define(
  "Posts",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    usuario: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    idUsuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Pessoas",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    post: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    tableName: "Posts",
    timestamps: true,
  },
);

Pessoas.hasMany(Posts, {
  foreignKey: "idUsuario",
});

Posts.belongsTo(Pessoas, {
  foreignKey: "idUsuario",
});

async function sincronizar() {
  try {
    await sequelize.sync();
    console.log("Tabelas sincronizadas com sucesso.");
  } catch (erro) {
    console.log(erro + " Tabelas nao sincronizadas.");
  }
}

const dbPronto = sincronizar();

// Garante que as tabelas estejam criadas antes de atender qualquer acesso na nuvem
app.use(async (req, res, next) => {
  await dbPronto;
  next();
});

// Rotas
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/cadastro", async (req, res) => {
  try {
    const { nome, turma } = req.body;
    await Pessoas.create({ nome, turma });
    res.status(201).json({ mensagem: "Cadastro realizado com sucesso!" });
  } catch (erro) {
    console.log("Erro: " + erro);
    res.status(500).json({ erro: "Falha interna no servidor" });
  }
});

app.post("/cadastro-post", async (req, res) => {
  try {
    const { usuario, idUsuario, post } = req.body;
    await Posts.create({ usuario, idUsuario, post });
    res.status(201).json({ mensagem: "Post realizado com sucesso!" });
  } catch (erro) {
    console.log("Erro: " + erro);
    res.status(500).json({ erro: "Falha interna no servidor" });
  }
});

app.get("/pessoas", async (req, res) => {
  try {
    const pessoas = await Pessoas.findAll();
    res.status(200).json(pessoas);
  } catch (erro) {
    console.error("Erro ao buscar dados:", erro);
    res
      .status(500)
      .json({ erro: "Erro ao buscar os cadastros no banco de dados" });
  }
});

app.get("/posts", async (req, res) => {
  try {
    const posts = await Posts.findAll({
      include: {
        model: Pessoas,
      },
    });
    res.status(200).json(posts);
  } catch (erro) {
    console.error("Erro ao buscar dados:", erro);
    res
      .status(500)
      .json({ erro: "Erro ao buscar os cadastros no banco de dados" });
  }
});

app.put("/posts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { post } = req.body;

    await Posts.update({ post: post }, { where: { id: id } });

    res.status(200).json({ mensagem: "Post atualizado com sucesso!" });
  } catch (erro) {
    console.error("Erro ao editar post:", erro);
    res.status(500).json({ erro: "Erro ao editar o post" });
  }
});

app.delete("/posts/:id", async (req, res) => {
  try {
    const id = req.params.id;

    await Posts.destroy({
      where: { id: id },
    });

    res.status(200).json({ mensagem: "Post excluído com sucesso!" });
  } catch (erro) {
    console.error("Erro ao excluir post:", erro);
    res.status(500).json({ erro: "Erro ao excluir o post" });
  }
});

// Inicia o servidor normalmente no computador local
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("Servidor online");
  });
}

// Exporta o app para a Vercel conseguir executar
module.exports = app;
