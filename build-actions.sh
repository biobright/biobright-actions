#!/bin/bash

for dir in deployment-actions/* ; do
  echo 'updating '$dir'/dist'
  npm run build -- $dir/index.js -o $dir/dist -m
done
