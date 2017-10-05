#!bin/bash

polymer build;
cd build;
cp -R minified final/;
rm -r final/bower_components/firebase/*;
cp -r full-js/bower_components/firebase/* final/bower_components/firebase;
rm -r final/src/yta-onboarding.html;
cp full-css/src/yta-onboarding.html final/src;