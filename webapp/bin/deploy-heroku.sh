set -e
app=${APP:-"ethernal-app-alpha"}
env=${ENV:-"staging"}
process="web"
image="registry.heroku.com/$app/$process"
docker build --build-arg ENV=$env --build-arg SENTRY_DSN=https://d258bb75ef6d4475ab633eaa24d95a1a@o259280.ingest.sentry.io/5273033 --build-arg COMMIT=$(git log -1 --format=%h) -t $image .
heroku container:login
docker push $image
heroku container:release $process --app $app
