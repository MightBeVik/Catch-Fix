### Format
Name - Date\
Module\
Details

#### Nay - 2026-04-22
**Service Registry**\
[Scripts] Add run.sh and setup_env.sh\
[UI] Add new field Service Type(Local, Cloud). Add LM Studio in Provider Type. Add validation of madatary fields.\
[UI] Add inline test result in Service Card.\
[API] Add try/catch in testServiceConnection to fix 502 Bad Gateway\
[API] Refactor callAnthropic → callLLMProvider and fix all the error messages and guard logic\
[API] Fix to catch succss status from HTTP request correctly.\
[API] Error Message retrieved from LLM Provider

#### Nay - 2026-04-23
**Settings**
[Env] Add all db files to .gitignore
[UI] Add Settings Page with 3 tabs: User Account Management, Account Recovery, Change Password. Add password rules in Change Password tab.
[API] Implement API for Settings

