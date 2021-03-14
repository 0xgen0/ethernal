## Deploying to AWS Lambda

1. Run build script

```bash
npm run build
```

2. Upload `build.zip` to `drawMapChunks-originResponse` Lambda (us-east1).

3. Deploy to Lambda@Edge each existing CloudFront trigger `assets.dev.ethernal.world`.


If you are running into issue with sharp binaries, ensure you build succeeds with `npm install --arch=x64 --platform=linux sharp`.
