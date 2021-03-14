set -e
app=${APP:-"ethernal-be-alpha"}
env=${ENV:-"staging"}
process="web"
image="registry.heroku.com/$app/$process"
case $env in
    staging) cp ../webapp/contracts/staging.json src/contractsInfo.json ;;
    prod) cp ../webapp/contracts/production.json src/contractsInfo.json ;;
esac
docker build --build-arg COMMIT=$(git log -1 --format=%h) -t $image .
heroku container:login
docker push $image
heroku container:release $process --app $app
