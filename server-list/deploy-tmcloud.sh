set -e
app=${APP:-"ethernal-list"}
env=${ENV:-"staging"}
image="lumir/$app:$env"
docker build --build-arg ENV=$env --build-arg COMMIT=$(git log -1 --format=%h) -t $image .
docker push $image
