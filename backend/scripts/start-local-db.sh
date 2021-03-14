#!/bin/bash

if [ "$(docker ps -aq -f name=ethernal-db)" ];
then
   	echo "ethernal-db already exists."
    if [ "$(docker ps -aq -f status=exited -f name=ethernal-db)" ];
    then
        echo "ethernal-db down. Starting ..."
        docker start ethernal-db
    else
        echo "ethernal-db running."
    fi
else
    echo "Creating ethernal-db"
    docker run --name ethernal-db -e POSTGRES_PASSWORD=ethernal111 -d -p 5544:5432 postgres:12
fi
