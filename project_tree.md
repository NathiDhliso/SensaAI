# Project Source Tree

Generated on: 2026-01-26T14:05:22.353Z
Root: c:/Users/nathi/OneDrive/Documents/Projects/SensaPBL

├── 📂 **.agent**
│   └── 📂 **workflows**
│       ├── coding-guidelines.md
│       └── deployment.md
├── 📂 **.github**
│   └── 📂 **workflows**
│       └── ci-cd.yml
├── 📂 **backend**
│   ├── 📂 **data**
│   │   └── 📂 **blueprints**
│   │       ├── aws-saa.json
│   │       ├── az-104.json
│   │       └── pl-300.json
│   ├── 📂 **lambda**
│   │   ├── 📂 **deploy**
│   │   │   ├── 📂 **gen_v8**
│   │   │   │   ├── 📂 **generate_concepts**
│   │   │   │   │   ├── 📂 **services**
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── bedrock_service.py
│   │   │   │   │   │   └── dynamo_service.py
│   │   │   │   │   └── handler.py
│   │   │   │   └── 📂 **shared**
│   │   │   │       ├── __init__.py
│   │   │   │       ├── system_prompt.py
│   │   │   │       └── utils.py
│   │   │   ├── 📂 **query_concepts_v2**
│   │   │   │   ├── 📂 **shared**
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── system_prompt.py
│   │   │   │   │   └── utils.py
│   │   │   │   └── handler.py
│   │   │   ├── 📂 **query_v3**
│   │   │   │   ├── 📂 **query_concepts**
│   │   │   │   │   └── handler.py
│   │   │   │   └── 📂 **shared**
│   │   │   │       ├── __init__.py
│   │   │   │       ├── system_prompt.py
│   │   │   │       └── utils.py
│   │   │   ├── 📂 **temp_check**
│   │   │   │   ├── __init__.py
│   │   │   │   ├── handler.py
│   │   │   │   ├── system_prompt.py
│   │   │   │   └── utils.py
│   │   │   └── 📂 **temp_package**
│   │   │       ├── 📂 **generate_concepts**
│   │   │       │   ├── __init__.py
│   │   │       │   └── handler.py
│   │   │       └── 📂 **shared**
│   │   │           ├── __init__.py
│   │   │           ├── system_prompt.py
│   │   │           └── utils.py
│   │   ├── 📂 **generate_concepts**
│   │   │   ├── 📂 **services**
│   │   │   │   ├── __init__.py
│   │   │   │   ├── bedrock_service.py
│   │   │   │   └── dynamo_service.py
│   │   │   ├── __init__.py
│   │   │   ├── handler.old.py
│   │   │   └── handler.py
│   │   ├── 📂 **lambda_package**
│   │   │   ├── 📂 **query_concepts**
│   │   │   │   └── handler.py
│   │   │   ├── 📂 **services**
│   │   │   │   ├── __init__.py
│   │   │   │   ├── bedrock_service.py
│   │   │   │   └── dynamo_service.py
│   │   │   ├── 📂 **shared**
│   │   │   │   ├── __init__.py
│   │   │   │   ├── system_prompt.py
│   │   │   │   └── utils.py
│   │   │   ├── __init__.py
│   │   │   ├── handler.old.py
│   │   │   ├── handler.py
│   │   │   └── requirements.txt
│   │   ├── 📂 **query_concepts**
│   │   │   └── handler.py
│   │   ├── 📂 **shared**
│   │   │   ├── __init__.py
│   │   │   ├── system_prompt.py
│   │   │   └── utils.py
│   │   ├── package_lambda.ps1
│   │   └── requirements.txt
│   ├── 📂 **src**
│   │   ├── 📂 **lib**
│   │   │   └── system-prompt.ts
│   │   ├── 📂 **middleware**
│   │   │   ├── auth.ts
│   │   │   ├── error-handler.ts
│   │   │   └── rate-limit.ts
│   │   ├── 📂 **routes**
│   │   │   ├── auth.old.ts
│   │   │   ├── auth.ts
│   │   │   ├── concepts.ts
│   │   │   ├── content.ts
│   │   │   ├── generation.ts
│   │   │   └── health.ts
│   │   ├── 📂 **services**
│   │   │   ├── bedrock.ts
│   │   │   ├── confidence-scorer.ts
│   │   │   ├── feedback-processor.ts
│   │   │   └── link-validator.ts
│   │   ├── 📂 **types**
│   │   │   └── grounding.ts
│   │   ├── cleanup-duplicates.ts
│   │   └── index.ts
│   ├── .env
│   ├── .gitignore
│   ├── debug_final.json
│   ├── debug_out.txt
│   ├── debug.json
│   ├── package.json
│   └── tsconfig.json
├── 📂 **docs**
│   ├── 📂 **prompts**
│   │   ├── README.md
│   │   ├── v4.0_master_curriculum_designer.txt
│   │   └── v4.2_cognitive_distinctions.txt
│   ├── 📂 **screenshots**
│   │   ├── 01_login_page_1768225401855.png
│   │   ├── 02_home_page_screenshot_1768225521426.png
│   │   ├── 03_generate_page_python_1768233578638.png
│   │   ├── 04_library_page_results_1768225681819.png
│   │   ├── 05_content_launchpad_top_1768225753021.png
│   │   ├── 06_content_launchpad_middle_1768225778392.png
│   │   ├── 07_velocity_phase_1_why_1768226069537.png
│   │   ├── 08_velocity_step_2_explore_tier_structure_1768226200912.png
│   │   ├── 09_study_command_center_overview_1768225984674.png
│   │   ├── 10_velocity_step_2_explore_predict_links_1768226236712.png
│   │   ├── 11_velocity_step_2_explore_predict_links_content_1768226308301.png
│   │   ├── 12_velocity_step_2_explore_predict_links_check_1768226270240.png
│   │   ├── 13_velocity_step_2_explore_gap_priming_content_1768226334756.png
│   │   ├── 14_velocity_step_3_note_concept_map_builder_1768226377310.png
│   │   ├── 15_velocity_step_3_note_builder_with_tools_1768232509656.png
│   │   ├── 16_velocity_step_4_study_make_it_real_content_1768232881007.png
│   │   ├── 17_velocity_step_4_study_reconstruction_test_content_1768232952702.png
│   │   ├── 18_velocity_step_4_study_test_reconstruction_interactive_1768232976455.png
│   │   ├── 19_velocity_step_4_study_test_quiz_reconstruction_1768233131458.png
│   │   ├── 20_velocity_step_4_study_test_blank_sheet_content_1768233216958.png
│   │   ├── 21_settings_page_1768233608901.png
│   │   └── 22_study_page_power_bi_1768225851477.png
│   ├── AWS_CLI_SETUP_COMPLETE.md
│   ├── BEDROCK_AUTH_SOLUTION.md
│   ├── DETAIL_IMPROVEMENTS.md
│   ├── E2E UI-UX V1 12-1-26.md
│   ├── GapsReport.md
│   ├── LaunchpadDashboardReport.md
│   ├── sensa-v2-blueprint.md
│   ├── SILVER_BULLET_LEARNING_ARCHITECTURE.md
│   ├── SYSTEM_PROMPT_UPDATE_PLAN.md
│   └── VELOCITY_WORKFLOW_AUDIT.md
├── 📂 **infra**
│   ├── 📂 **scripts**
│   │   └── deploy.sh
│   ├── 📂 **terraform**
│   │   ├── 📂 **.terraform**
│   │   │   ├── 📂 **modules**
│   │   │   │   └── modules.json
│   │   │   └── 📂 **providers**
│   │   │       └── 📂 **registry.terraform.io**
│   │   │           └── 📂 **hashicorp**
│   │   │               ├── 📂 **archive**
│   │   │               │   └── 📂 **2.7.1**
│   │   │               │       └── 📂 **windows_386**
│   │   │               │           ├── LICENSE.txt
│   │   │               │           └── terraform-provider-archive_v2.7.1_x5.exe
│   │   │               ├── 📂 **aws**
│   │   │               │   └── 📂 **5.100.0**
│   │   │               │       └── 📂 **windows_386**
│   │   │               │           ├── LICENSE.txt
│   │   │               │           └── terraform-provider-aws_v5.100.0_x5.exe
│   │   │               ├── 📂 **helm**
│   │   │               │   └── 📂 **2.17.0**
│   │   │               │       └── 📂 **windows_386**
│   │   │               │           ├── LICENSE.txt
│   │   │               │           └── terraform-provider-helm_v2.17.0_x5.exe
│   │   │               ├── 📂 **kubernetes**
│   │   │               │   └── 📂 **2.38.0**
│   │   │               │       └── 📂 **windows_386**
│   │   │               │           ├── LICENSE.txt
│   │   │               │           └── terraform-provider-kubernetes_v2.38.0_x5.exe
│   │   │               └── 📂 **random**
│   │   │                   ├── 📂 **3.7.2**
│   │   │                   │   └── 📂 **windows_386**
│   │   │                   │       ├── LICENSE.txt
│   │   │                   │       └── terraform-provider-random_v3.7.2_x5.exe
│   │   │                   └── 📂 **3.8.0**
│   │   │                       └── 📂 **windows_386**
│   │   │                           ├── LICENSE.txt
│   │   │                           └── terraform-provider-random_v3.8.0_x5.exe
│   │   ├── 📂 **environments**
│   │   │   └── 📂 **pilot**
│   │   │       ├── main.tf
│   │   │       ├── terraform.tfvars
│   │   │       └── variables.tf
│   │   ├── 📂 **modules**
│   │   │   ├── 📂 **cognito**
│   │   │   │   ├── main.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   └── variables.tf
│   │   │   ├── 📂 **dynamodb**
│   │   │   │   ├── main.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   └── variables.tf
│   │   │   ├── 📂 **ecr**
│   │   │   │   ├── main.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   └── variables.tf
│   │   │   ├── 📂 **lambda**
│   │   │   │   ├── main.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   ├── placeholder.txt
│   │   │   │   └── variables.tf
│   │   │   └── 📂 **s3**
│   │   │       ├── main.tf
│   │   │       ├── outputs.tf
│   │   │       └── variables.tf
│   │   ├── .terraform.lock.hcl
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   ├── terraform.tfstate
│   │   ├── terraform.tfstate.1768332870.backup
│   │   ├── terraform.tfstate.backup
│   │   └── variables.tf
│   ├── client_info.json
│   └── sensapbl-storage-policy.json
├── 📂 **public**
│   ├── 📂 **assets**
│   │   ├── crumpled-texture.jpg
│   │   └── paper-texture.png
│   ├── 📂 **Audio**
│   │   ├── 📂 **Primer**
│   │   │   ├── action.mp3
│   │   │   ├── ambient-study.mp3
│   │   │   ├── ambient-study2.mp3
│   │   │   ├── breathe.mp3
│   │   │   ├── ready.mp3
│   │   │   ├── Reason.mp3
│   │   │   └── reward.mp3
│   │   └── 📂 **voice**
│   │       ├── buddy_apply_encouragement.mp3
│   │       ├── buddy_apply_intro.mp3
│   │       ├── buddy_apply_struggle.mp3
│   │       ├── buddy_apply_success.mp3
│   │       ├── buddy_apply_transition.mp3
│   │       ├── buddy_build_encouragement.mp3
│   │       ├── buddy_build_intro.mp3
│   │       ├── buddy_build_struggle.mp3
│   │       ├── buddy_build_success.mp3
│   │       ├── buddy_build_transition.mp3
│   │       ├── buddy_master_encouragement.mp3
│   │       ├── buddy_master_intro.mp3
│   │       ├── buddy_master_struggle.mp3
│   │       ├── buddy_master_success.mp3
│   │       ├── buddy_master_transition.mp3
│   │       ├── buddy_preview_encouragement.mp3
│   │       ├── buddy_preview_intro.mp3
│   │       ├── buddy_preview_struggle.mp3
│   │       ├── buddy_preview_success.mp3
│   │       ├── buddy_preview_transition.mp3
│   │       ├── buddy_prime_encouragement.mp3
│   │       ├── buddy_prime_intro.mp3
│   │       ├── buddy_prime_struggle.mp3
│   │       ├── buddy_prime_success.mp3
│   │       ├── buddy_prime_transition.mp3
│   │       ├── buddy_retain_encouragement.mp3
│   │       ├── buddy_retain_intro.mp3
│   │       ├── buddy_retain_struggle.mp3
│   │       ├── buddy_retain_success.mp3
│   │       ├── buddy_retain_transition.mp3
│   │       ├── buddy_scout_encouragement.mp3
│   │       ├── buddy_scout_intro.mp3
│   │       ├── buddy_scout_struggle.mp3
│   │       ├── buddy_scout_success.mp3
│   │       ├── buddy_scout_transition.mp3
│   │       ├── coach_apply_encouragement.mp3
│   │       ├── coach_apply_intro.mp3
│   │       ├── coach_apply_struggle.mp3
│   │       ├── coach_apply_success.mp3
│   │       ├── coach_apply_transition.mp3
│   │       ├── coach_build_encouragement.mp3
│   │       ├── coach_build_intro.mp3
│   │       ├── coach_build_struggle.mp3
│   │       ├── coach_build_success.mp3
│   │       ├── coach_build_transition.mp3
│   │       ├── coach_master_encouragement.mp3
│   │       ├── coach_master_intro.mp3
│   │       ├── coach_master_struggle.mp3
│   │       ├── coach_master_success.mp3
│   │       ├── coach_master_transition.mp3
│   │       ├── coach_preview_encouragement.mp3
│   │       ├── coach_preview_intro.mp3
│   │       ├── coach_preview_struggle.mp3
│   │       ├── coach_preview_success.mp3
│   │       ├── coach_preview_transition.mp3
│   │       ├── coach_prime_encouragement.mp3
│   │       ├── coach_prime_intro.mp3
│   │       ├── coach_prime_struggle.mp3
│   │       ├── coach_prime_success.mp3
│   │       ├── coach_prime_transition.mp3
│   │       ├── coach_retain_encouragement.mp3
│   │       ├── coach_retain_intro.mp3
│   │       ├── coach_retain_struggle.mp3
│   │       ├── coach_retain_success.mp3
│   │       ├── coach_retain_transition.mp3
│   │       ├── coach_scout_encouragement.mp3
│   │       ├── coach_scout_intro.mp3
│   │       ├── coach_scout_struggle.mp3
│   │       ├── coach_scout_success.mp3
│   │       ├── coach_scout_transition.mp3
│   │       ├── goggins_apply_encouragement.mp3
│   │       ├── goggins_apply_intro.mp3
│   │       ├── goggins_apply_struggle.mp3
│   │       ├── goggins_apply_success.mp3
│   │       ├── goggins_apply_transition.mp3
│   │       ├── goggins_build_encouragement.mp3
│   │       ├── goggins_build_intro.mp3
│   │       ├── goggins_build_struggle.mp3
│   │       ├── goggins_build_success.mp3
│   │       ├── goggins_build_transition.mp3
│   │       ├── goggins_master_encouragement.mp3
│   │       ├── goggins_master_intro.mp3
│   │       ├── goggins_master_struggle.mp3
│   │       ├── goggins_master_success.mp3
│   │       ├── goggins_master_transition.mp3
│   │       ├── goggins_preview_encouragement.mp3
│   │       ├── goggins_preview_intro.mp3
│   │       ├── goggins_preview_struggle.mp3
│   │       ├── goggins_preview_success.mp3
│   │       ├── goggins_preview_transition.mp3
│   │       ├── goggins_prime_encouragement.mp3
│   │       ├── goggins_prime_intro.mp3
│   │       ├── goggins_prime_struggle.mp3
│   │       ├── goggins_prime_success.mp3
│   │       ├── goggins_prime_transition.mp3
│   │       ├── goggins_retain_encouragement.mp3
│   │       ├── goggins_retain_intro.mp3
│   │       ├── goggins_retain_struggle.mp3
│   │       ├── goggins_retain_success.mp3
│   │       ├── goggins_retain_transition.mp3
│   │       ├── goggins_scout_encouragement.mp3
│   │       ├── goggins_scout_intro.mp3
│   │       ├── goggins_scout_struggle.mp3
│   │       ├── goggins_scout_success.mp3
│   │       ├── goggins_scout_transition.mp3
│   │       ├── sage_apply_encouragement.mp3
│   │       ├── sage_apply_intro.mp3
│   │       ├── sage_apply_struggle.mp3
│   │       ├── sage_apply_success.mp3
│   │       ├── sage_apply_transition.mp3
│   │       ├── sage_build_encouragement.mp3
│   │       ├── sage_build_intro.mp3
│   │       ├── sage_build_struggle.mp3
│   │       ├── sage_build_success.mp3
│   │       ├── sage_build_transition.mp3
│   │       ├── sage_master_encouragement.mp3
│   │       ├── sage_master_intro.mp3
│   │       ├── sage_master_struggle.mp3
│   │       ├── sage_master_success.mp3
│   │       ├── sage_master_transition.mp3
│   │       ├── sage_preview_encouragement.mp3
│   │       ├── sage_preview_intro.mp3
│   │       ├── sage_preview_struggle.mp3
│   │       ├── sage_preview_success.mp3
│   │       ├── sage_preview_transition.mp3
│   │       ├── sage_prime_encouragement.mp3
│   │       ├── sage_prime_intro.mp3
│   │       ├── sage_prime_struggle.mp3
│   │       ├── sage_prime_success.mp3
│   │       ├── sage_prime_transition.mp3
│   │       ├── sage_retain_encouragement.mp3
│   │       ├── sage_retain_intro.mp3
│   │       ├── sage_retain_struggle.mp3
│   │       ├── sage_retain_success.mp3
│   │       ├── sage_retain_transition.mp3
│   │       ├── sage_scout_encouragement.mp3
│   │       ├── sage_scout_intro.mp3
│   │       ├── sage_scout_struggle.mp3
│   │       ├── sage_scout_success.mp3
│   │       ├── sage_scout_transition.mp3
│   │       ├── socratic_apply_encouragement.mp3
│   │       ├── socratic_apply_intro.mp3
│   │       ├── socratic_apply_struggle.mp3
│   │       ├── socratic_apply_success.mp3
│   │       ├── socratic_apply_transition.mp3
│   │       ├── socratic_build_encouragement.mp3
│   │       ├── socratic_build_intro.mp3
│   │       ├── socratic_build_struggle.mp3
│   │       ├── socratic_build_success.mp3
│   │       ├── socratic_build_transition.mp3
│   │       ├── socratic_master_encouragement.mp3
│   │       ├── socratic_master_intro.mp3
│   │       ├── socratic_master_struggle.mp3
│   │       ├── socratic_master_success.mp3
│   │       ├── socratic_master_transition.mp3
│   │       ├── socratic_preview_encouragement.mp3
│   │       ├── socratic_preview_intro.mp3
│   │       ├── socratic_preview_struggle.mp3
│   │       ├── socratic_preview_success.mp3
│   │       ├── socratic_preview_transition.mp3
│   │       ├── socratic_prime_encouragement.mp3
│   │       ├── socratic_prime_intro.mp3
│   │       ├── socratic_prime_struggle.mp3
│   │       ├── socratic_prime_success.mp3
│   │       ├── socratic_prime_transition.mp3
│   │       ├── socratic_retain_encouragement.mp3
│   │       ├── socratic_retain_intro.mp3
│   │       ├── socratic_retain_struggle.mp3
│   │       ├── socratic_retain_success.mp3
│   │       ├── socratic_retain_transition.mp3
│   │       ├── socratic_scout_encouragement.mp3
│   │       ├── socratic_scout_intro.mp3
│   │       ├── socratic_scout_struggle.mp3
│   │       ├── socratic_scout_success.mp3
│   │       └── socratic_scout_transition.mp3
│   ├── 📂 **panoramas**
│   │   ├── 📂 **tech-campus**
│   │   │   ├── brick-security-back.jpg
│   │   │   ├── brick-security-front.jpg
│   │   │   ├── brick-security-left.jpg
│   │   │   ├── brick-security-right.jpg
│   │   │   ├── control-tower-back.jpg
│   │   │   ├── control-tower-front.jpg
│   │   │   ├── control-tower-left.jpg
│   │   │   ├── control-tower-right.jpg
│   │   │   ├── glass-tower-back.jpg
│   │   │   ├── glass-tower-front.jpg
│   │   │   ├── glass-tower-left.jpg
│   │   │   ├── glass-tower-right.jpg
│   │   │   ├── library-back.jpg
│   │   │   ├── library-front.jpg
│   │   │   ├── library-left.jpg
│   │   │   ├── library-right.jpg
│   │   │   ├── network-hub-back.jpg
│   │   │   ├── network-hub-front.jpg
│   │   │   ├── network-hub-left.jpg
│   │   │   ├── network-hub-right.jpg
│   │   │   ├── steel-factory-back.jpg
│   │   │   ├── steel-factory-front.jpg
│   │   │   ├── steel-factory-left.jpg
│   │   │   ├── steel-factory-right.jpg
│   │   │   ├── warehouse-back.jpg
│   │   │   ├── warehouse-front.jpg
│   │   │   ├── warehouse-left.jpg
│   │   │   └── warehouse-right.jpg
│   │   ├── 📂 **university**
│   │   └── manifest.json
│   ├── pdf.worker.min.mjs
│   ├── PL_300_1766515561801-c6ara0akv.json
│   └── vite.svg
├── 📂 **scripts**
│   ├── check-any-types.ps1
│   ├── check-console-logs.ps1
│   ├── check-css-var-prefixes.ps1
│   ├── check-hardcoded-colors.ps1
│   ├── check-hardcoded-subjects.ps1
│   ├── check-magic-timeouts.ps1
│   ├── generate_project_map.js
│   ├── generate-map.js
│   ├── generate-voices.js
│   ├── migrate-broken-results.ts
│   ├── revalidate-pl300.ts
│   ├── run-all-checks.ps1
│   ├── scan-css-conflicts.js
│   ├── scan-duplicate-css-properties.js
│   ├── scan-hardcoded-colors.js
│   └── voice-data.json
├── 📂 **src**
│   ├── 📂 **components**
│   │   ├── 📂 **auth**
│   │   │   ├── index.ts
│   │   │   └── ProtectedRoute.tsx
│   │   ├── 📂 **dashboard**
│   │   │   ├── MasteryDashboard.module.css
│   │   │   └── MasteryDashboard.tsx
│   │   ├── 📂 **error**
│   │   │   ├── LearningErrorBoundary.module.css
│   │   │   └── LearningErrorBoundary.tsx
│   │   ├── 📂 **generation**
│   │   │   ├── AgentCore.tsx
│   │   │   └── CognitiveStream.tsx
│   │   ├── 📂 **layout**
│   │   │   ├── index.ts
│   │   │   ├── StudyLayout.module.css
│   │   │   └── StudyLayout.tsx
│   │   ├── 📂 **learning**
│   │   │   ├── 📂 **launchpad**
│   │   │   │   ├── BucketReadinessChecklist.module.css
│   │   │   │   ├── BucketReadinessChecklist.tsx
│   │   │   │   ├── ContentHealthIndicators.module.css
│   │   │   │   ├── ContentHealthIndicators.tsx
│   │   │   │   ├── ContentLaunchpad.module.css
│   │   │   │   ├── ContentLaunchpad.tsx
│   │   │   │   ├── CoverageTreemap.tsx
│   │   │   │   ├── DashboardTutorial.tsx
│   │   │   │   ├── EquationMetadataCard.module.css
│   │   │   │   ├── EquationMetadataCard.tsx
│   │   │   │   ├── LifecyclePhaseDisplay.module.css
│   │   │   │   ├── LifecyclePhaseDisplay.tsx
│   │   │   │   ├── ScoreCard.module.css
│   │   │   │   ├── ScoreCard.tsx
│   │   │   │   ├── SourceVerification.module.css
│   │   │   │   ├── SourceVerification.tsx
│   │   │   │   ├── TierDistributionChart.module.css
│   │   │   │   └── TierDistributionChart.tsx
│   │   │   ├── 📂 **LearningToolbar**
│   │   │   │   ├── FocusTimer.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── LearningToolbar.module.css
│   │   │   │   ├── LearningToolbar.tsx
│   │   │   │   ├── ProgressAnalytics.tsx
│   │   │   │   └── QuickQuiz.tsx
│   │   │   ├── BlankSheetTest.module.css
│   │   │   ├── BlankSheetTest.tsx
│   │   │   ├── BridgeBuilder.module.css
│   │   │   ├── BridgeBuilder.tsx
│   │   │   ├── CelebrationModal.module.css
│   │   │   ├── CelebrationModal.tsx
│   │   │   ├── CoachsChoice.module.css
│   │   │   ├── CoachsChoice.tsx
│   │   │   ├── CognitiveGauge.module.css
│   │   │   ├── CognitiveGauge.tsx
│   │   │   ├── ConceptCard.module.css
│   │   │   ├── ConceptCard.tsx
│   │   │   ├── ConceptMapBuilder.module.css
│   │   │   ├── ConceptMapBuilder.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   ├── ConfusionDrill.module.css
│   │   │   ├── ConfusionDrill.tsx
│   │   │   ├── ConnectionTypeModal.module.css
│   │   │   ├── ConnectionTypeModal.tsx
│   │   │   ├── DiagnosticLaunchSystem.module.css
│   │   │   ├── DiagnosticLaunchSystem.tsx
│   │   │   ├── FlagInaccuracyButton.tsx
│   │   │   ├── GuidedPrimer.module.css
│   │   │   ├── GuidedPrimer.tsx
│   │   │   ├── index.ts
│   │   │   ├── MasteryChallenge.module.css
│   │   │   ├── MasteryChallenge.tsx
│   │   │   ├── MicroLearningLoopController.module.css
│   │   │   ├── MicroLearningLoopController.tsx
│   │   │   ├── NeuralResetBanner.module.css
│   │   │   ├── NeuralResetBanner.tsx
│   │   │   ├── NeuralResetModal.module.css
│   │   │   ├── NeuralResetModal.tsx
│   │   │   ├── NomenclatureSprint.module.css
│   │   │   ├── NomenclatureSprint.tsx
│   │   │   ├── OnboardingFlow.module.css
│   │   │   ├── OnboardingFlow.tsx
│   │   │   ├── PhaseNavigator.module.css
│   │   │   ├── PhaseNavigator.tsx
│   │   │   ├── PrerequisiteCheck.module.css
│   │   │   ├── PrerequisiteCheck.tsx
│   │   │   ├── SensaSynopticView.module.css
│   │   │   ├── SensaSynopticView.tsx
│   │   │   ├── SessionGoalManager.module.css
│   │   │   ├── SessionGoalManager.tsx
│   │   │   ├── SessionScoutPreview.module.css
│   │   │   ├── SessionScoutPreview.tsx
│   │   │   ├── SessionStartModal.module.css
│   │   │   ├── SessionStartModal.tsx
│   │   │   ├── SessionSummary.module.css
│   │   │   ├── SessionSummary.tsx
│   │   │   ├── SkipReasonModal.module.css
│   │   │   ├── SkipReasonModal.tsx
│   │   │   ├── UnifiedSessionBar.module.css
│   │   │   ├── UnifiedSessionBar.tsx
│   │   │   ├── VelocityLockInGate.module.css
│   │   │   └── VelocityLockInGate.tsx
│   │   ├── 📂 **settings**
│   │   │   ├── index.ts
│   │   │   ├── SettingsPanel.module.css
│   │   │   └── SettingsPanel.tsx
│   │   ├── 📂 **storage**
│   │   │   ├── CloudLibraryModal.module.css
│   │   │   └── CloudLibraryModal.tsx
│   │   └── 📂 **ui**
│   │       ├── BackgroundJobToast.module.css
│   │       ├── BackgroundJobToast.tsx
│   │       ├── BionicText.tsx
│   │       ├── ConceptProgressIndicator.module.css
│   │       ├── ConceptProgressIndicator.tsx
│   │       ├── EquationTracker.module.css
│   │       ├── EquationTracker.tsx
│   │       ├── FlowProgressBar.module.css
│   │       ├── FlowProgressBar.tsx
│   │       ├── HelpModal.module.css
│   │       ├── HelpModal.tsx
│   │       ├── index.ts
│   │       ├── KnowledgeCutoffBanner.tsx
│   │       ├── MomentumCheckpoint.module.css
│   │       ├── MomentumCheckpoint.tsx
│   │       ├── SensaIcon.module.css
│   │       ├── SensaIcon.tsx
│   │       ├── SensaShape.module.css
│   │       ├── SensaShape.tsx
│   │       ├── SensaShape.types.ts
│   │       ├── SensaShape.utils.tsx
│   │       ├── SessionTimeToast.module.css
│   │       ├── SessionTimeToast.tsx
│   │       ├── SpeedReaderBar.module.css
│   │       ├── SpeedReaderBar.tsx
│   │       ├── TierExplainer.module.css
│   │       └── TierExplainer.tsx
│   ├── 📂 **constants**
│   │   ├── app-config.ts
│   │   ├── content-constants.ts
│   │   ├── learning-content.ts
│   │   ├── learning-science.ts
│   │   ├── sensa-flow-constants.ts
│   │   ├── storage-keys.ts
│   │   ├── theme-colors.ts
│   │   ├── ui-constants.ts
│   │   └── z-index.ts
│   ├── 📂 **contexts**
│   │   └── ContentContext.tsx
│   ├── 📂 **hooks**
│   │   ├── index.ts
│   │   ├── use-concept-cache.ts
│   │   ├── useBackgroundJobRecovery.ts
│   │   ├── useBionicReading.ts
│   │   ├── useClickOutside.ts
│   │   ├── useCollisionDetection.ts
│   │   ├── useConceptsQuery.ts
│   │   ├── useContent.ts
│   │   ├── useCountdownTimer.ts
│   │   ├── useEscapeKey.ts
│   │   ├── useFlowState.ts
│   │   ├── useGenerationEngine.ts
│   │   ├── useGenerationRecovery.ts
│   │   ├── useLearningFlow.ts
│   │   ├── useOrientationAwareZoom.ts
│   │   ├── usePauseGlobalTimer.ts
│   │   ├── usePrerequisiteCheck.ts
│   │   ├── useQuizKeyboard.ts
│   │   ├── useRepairSentinel.ts
│   │   ├── useResponsiveNodeSize.ts
│   │   ├── useSensaFlow.ts
│   │   └── useVoice.ts
│   ├── 📂 **lib**
│   │   ├── 📂 **ai**
│   │   │   ├── 📂 **coach**
│   │   │   │   ├── index.ts
│   │   │   │   └── personas.ts
│   │   │   ├── 📂 **phases**
│   │   │   │   ├── build-ai.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── preview-ai.ts
│   │   │   │   ├── retain-ai.ts
│   │   │   │   └── score-map.ts
│   │   │   └── content-analytics.ts
│   │   ├── 📂 **api**
│   │   │   ├── client.ts
│   │   │   ├── concepts.ts
│   │   │   ├── generation.ts
│   │   │   └── index.ts
│   │   ├── 📂 **content-adapter**
│   │   │   ├── 📂 **__tests__**
│   │   │   │   └── transformer.test.ts
│   │   │   ├── dynamic-content-loader.ts
│   │   │   ├── index.ts
│   │   │   ├── json-content-parser.ts
│   │   │   ├── parse-ai-response.ts
│   │   │   ├── sensa-ai-integration.ts
│   │   │   ├── transformer.ts
│   │   │   ├── types.ts
│   │   │   └── validate-tier-progression.ts
│   │   ├── 📂 **file-processing**
│   │   │   └── context-optimizer.ts
│   │   ├── 📂 **generation**
│   │   │   ├── backend-generator.ts
│   │   │   ├── claude-client.ts
│   │   │   ├── confusion-generator.ts
│   │   │   ├── dependency-parser.ts
│   │   │   ├── diagnostic-generator.ts
│   │   │   ├── dynamic-lifecycle.ts
│   │   │   ├── image-generator.ts
│   │   │   ├── json-merger.ts
│   │   │   ├── lifecycle-engine.ts
│   │   │   ├── repair-orchestrator.ts
│   │   │   ├── surgical-merge.ts
│   │   │   ├── tier-calculator.ts
│   │   │   ├── validation.ts
│   │   │   └── visual-enhancer.ts
│   │   ├── 📂 **learning**
│   │   │   ├── concept-selection.ts
│   │   │   ├── interleaving-algorithm.ts
│   │   │   ├── metrics-tracker.ts
│   │   │   ├── prerequisite-utils.ts
│   │   │   └── spacing-engine.ts
│   │   ├── 📂 **monitoring**
│   │   │   └── performance.ts
│   │   ├── 📂 **storage**
│   │   │   ├── cloud-storage.ts
│   │   │   ├── import.ts
│   │   │   ├── index.ts
│   │   │   ├── indexed-db-storage.ts
│   │   │   ├── local-storage.ts
│   │   │   └── types.ts
│   │   ├── 📂 **types**
│   │   │   ├── concept-schema.ts
│   │   │   ├── confusion.ts
│   │   │   ├── generation.ts
│   │   │   ├── learning.ts
│   │   │   └── sensa-flow.types.ts
│   │   ├── 📂 **utils**
│   │   │   ├── alias-generator.ts
│   │   │   ├── layout-utils.ts
│   │   │   └── subject-domain-detector.ts
│   │   ├── 📂 **validation**
│   │   │   └── content-quality.ts
│   │   ├── 📂 **voice**
│   │   │   └── static-lines.ts
│   │   ├── api-resilience.ts
│   │   ├── audio.ts
│   │   ├── content-loader.ts
│   │   ├── system-prompt.ts
│   │   └── utils.ts
│   ├── 📂 **pages**
│   │   ├── AuthCallback.tsx
│   │   ├── ConfirmSignUp.tsx
│   │   ├── DocumentView.module.css
│   │   ├── DocumentView.tsx
│   │   ├── Generate.module.css
│   │   ├── Generate.tsx
│   │   ├── Home.module.css
│   │   ├── Home.tsx
│   │   ├── Login.module.css
│   │   ├── Login.tsx
│   │   ├── SavedResults.module.css
│   │   ├── SavedResults.tsx
│   │   ├── Settings.module.css
│   │   ├── Settings.tsx
│   │   ├── SignUp.tsx
│   │   ├── Study.module.css
│   │   ├── Study.tsx
│   │   ├── VelocityLearning.module.css
│   │   └── VelocityLearning.tsx
│   ├── 📂 **services**
│   │   └── AudioService.ts
│   ├── 📂 **store**
│   │   ├── 📂 **slices**
│   │   │   ├── createCognitiveSlice.ts
│   │   │   ├── createDiagnosticSlice.ts
│   │   │   ├── createFocusSlice.ts
│   │   │   ├── createNavigationSlice.ts
│   │   │   ├── createSessionSlice.ts
│   │   │   ├── createStudySlice.ts
│   │   │   ├── createUISlice.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── auth-store.old.ts
│   │   ├── auth-store.ts
│   │   ├── generation-store.ts
│   │   ├── learning-store.old.ts
│   │   ├── learning-store.ts
│   │   ├── personalization-store.ts
│   │   ├── theme-store.ts
│   │   └── ui-store.ts
│   ├── 📂 **styles**
│   │   └── animations.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .cursorrules
├── .env
├── .env.example
├── .gitignore
├── amplify.yml
├── audit_colors.ps1
├── audit_results.txt
├── audit_ui_advanced.ps1
├── audit_ui.ps1
├── eslint.config.js
├── index.html
├── Makefile
├── models.json
├── nginx.conf
├── package.json
├── README.md
├── test-generation.js
├── test-generation.ps1
├── tsc_errors.txt
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
