@echo off
title FK ATC COM Trainer Localhost
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start_FK_ATC_Localhost.ps1"
