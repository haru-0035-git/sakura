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
