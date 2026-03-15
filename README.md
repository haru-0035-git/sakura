# sakura

花が咲いて散る動きを楽しめる、React + Vite 製のシンプルなアニメーションアプリです。

## できること

- `fall` モード: 長押しして花を咲かせ、離すと花びらが散ります。
- `fill` モード: 長押しして画面内に花を増やしていきます。

## ローカルで起動する

前提:

- Node.js と npm が使えること

手順:

1. 依存関係をインストールします。

```bash
npm install
```

2. 開発サーバーを起動します。

```bash
npm run dev
```

3. ブラウザで表示します。

```text
http://localhost:5173
```

## Tailscale 経由で他の端末から開く

1. PC とスマートフォンの両方で Tailscale にログインし、同じ tailnet に参加します。
2. このプロジェクトで開発サーバーを起動します。

```bash
npm run dev
```

3. PC の Tailscale IPv4 アドレスを確認します。

```bash
tailscale ip -4
```

4. スマートフォンのブラウザで次の URL を開きます。

```text
http://<PCのTailscale IP>:5173
```

例:

```text
http://100.101.102.103:5173
```

接続できない場合は、Windows Defender Firewall で Node.js の通信が許可されているか確認してください。

## GitHub Pages で公開する

このリポジトリは GitHub Actions を使って GitHub Pages にデプロイできるよう設定済みです。

1. このプロジェクトを GitHub に push します。
2. GitHub の `Settings` -> `Pages` を開きます。
3. `Source` を `GitHub Actions` に設定します。
4. `main` または `master` ブランチに push します。

デプロイが成功すると、GitHub Pages に `dist/` の内容が公開されます。

## ビルド

本番用ビルドは次のコマンドで作成できます。

```bash
npm run build
```
