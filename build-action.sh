#!/bin/bash

echo 'updating '$1'/dist'
npm run build -- $1/index.js -o $1/dist -m
