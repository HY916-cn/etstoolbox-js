@echo off
chcp 65001 >nul
title ETSToolbox Answer Console
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0answer-console.ps1"
