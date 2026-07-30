# Interview Marking — Windows uninstall helpers (electron-builder NSIS include)
# Always removes transcription data. Optionally removes all settings/app data.
# Skips data cleanup when the uninstaller runs as part of an upgrade (${isUpdated}).

!macro customUnInstall
  ${ifNot} ${isUpdated}
    SetShellVarContext current

    ; Privacy: transcription data must always be deleted on uninstall.
    InitPluginsDir
    SetOutPath "$PLUGINSDIR"
    File "/oname=strip-transcripts.ps1" "${BUILD_RESOURCES_DIR}\strip-transcripts.ps1"
    nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\strip-transcripts.ps1"'
    Pop $R1
    Delete "$PLUGINSDIR\strip-transcripts.ps1"

    MessageBox MB_YESNO|MB_ICONQUESTION \
      "Remove Interview Marking settings and local data as well?$\r$\n$\r$\nYes = delete criteria, bindings, sessions, and app data.$\r$\nNo = keep settings (transcription data is already removed)." \
      /SD IDNO IDYES im_remove_all IDNO im_keep_settings

    im_remove_all:
      ; Thorough wipe of Electron userData / cache directories (current user).
      RMDir /r "$APPDATA\${APP_FILENAME}"
      RMDir /r "$LOCALAPPDATA\${APP_FILENAME}"
      !ifdef APP_PRODUCT_FILENAME
        RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
        RMDir /r "$LOCALAPPDATA\${APP_PRODUCT_FILENAME}"
      !endif
      !ifdef APP_PACKAGE_NAME
        RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
        RMDir /r "$LOCALAPPDATA\${APP_PACKAGE_NAME}"
      !endif
      ; Known product / package name variants
      RMDir /r "$APPDATA\Interview Marking"
      RMDir /r "$LOCALAPPDATA\Interview Marking"
      RMDir /r "$APPDATA\interview-marking"
      RMDir /r "$LOCALAPPDATA\interview-marking"
      Goto im_uninstall_done

    im_keep_settings:
    im_uninstall_done:
  ${endIf}
!macroend
