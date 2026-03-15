# sakura

## Tailscale経由でスマホ表示する手順

1. PCとスマホの両方でTailscaleにログインし、同じTailnetに参加します。
2. このプロジェクトで開発サーバーを起動します。

```bash
npm run dev
```

3. PC側のTailscale IPv4アドレスを確認します。

```bash
tailscale ip -4
```

4. スマホのブラウザで次のURLを開きます。

```text
http://<PCのTailscale IP>:5173
```

例:

```text
http://100.101.102.103:5173
```

うまく開けない場合は、Windows Defender FirewallでNode.jsの受信を許可してください。
## GitHub Pages

This repository is configured to deploy to GitHub Pages with GitHub Actions.

1. Push this project to a GitHub repository named `sakura`.
2. In GitHub, open `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or `master`.

The workflow will build the Vite app and publish the contents of `dist/`.
