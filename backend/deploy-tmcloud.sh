set -e
app=${APP:-"ethernal"}
env=${ENV:-"staging"}
image="lumir/$app:$env"
echo 'deploying to '$image
case $env in
    staging*) cp ../webapp/contracts/staging.json src/contractsInfo.json; ;;
    prod*) cp ../webapp/contracts/production.json src/contractsInfo.json; ;;
esac
docker build --build-arg COMMIT=$(git log -1 --format=%h) -t $image .
docker push $image
