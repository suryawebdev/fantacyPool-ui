# FantacyPoolUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

Project Highlevel architecture:

```mermaid
flowchart TD
    A1[Signup Page]
    A2[Signin Page]
    A3[User Dashboard]
    A4[Admin Dashboard]
    A5[Auth Service]
    B1[Auth Controller]
    B2[User Service]
    B3[User Repository]
    B4[JWT Provider]
    B5[User DB]

    A1 -- POST /api/auth/signup --> B1
    A2 -- POST /api/auth/signin --> B1
    A3 -- Authenticated Requests (JWT) --> B1
    A4 -- Authenticated Requests (JWT) --> B1
    B1 -- Calls --> B2
    B2 -- CRUD --> B3
    B3 -- Stores/Retrieves --> B5
    B1 -- Issues/Validates --> B4
    B4 -- Signs/Verifies --> A3
    B4 -- Signs/Verifies --> A4
    A5 -- Handles HTTP/JWT --> A1
    A5 -- Handles HTTP/JWT --> A2
    A5 -- Handles HTTP/JWT --> A3
    A5 -- Handles HTTP/JWT --> A4
```

https://mermaid.live/edit#pako:eNqVkkuP0zAUhf-K5RVIbdMkTvNYIPWxGNhQtRmQSFiYxk0tEjvYTmGm6n_n5jGSoYNUvIpzvnt97rEv-CALhhOMYB0r-fNwosqgdJMLNK6lm-15KdoGbWnJvlqC1wtc3Ah-9qiZQhuqT98kVYWtkWxZ1FDzqhhky9ac0J6pMz_YLVfuoKylMEpWFVO26A3nvVI2OtmxRmpupHqyRZJ9-JyirZJnXvzZMBgHWMFPOwk0naLtx32KHNpwh4IjRw_ZTKfvwKQdzj9YGP2G9Tu2m48Jww_UsAIc_2iZNhq9AY9vb0vIf5esevdrWlV60Dw7wV7bPW4Gybcj7KQ9ZMe0s2NGcXZmY4fg7-7vtQYLzida8QI8jRixM--7QQ5AMcWPfISW_j0Qsd9KBz1QUVSgPqTp1ulus8fc-zDvPsy_DyN4gkvFC5wY1bIJrpmqabfFl65BjuGuapbjBD4Lqr7nOBdXqGmo-CJl_VKmZFueXjZt08W44bRUFIgjrXSHMAHvdS1bYXAS9B1wcsG_cOL58Swm8zBcLPyIuFEcTfATThbhzI1cN46iICK-G4XXCX7uz5zPgkUQz4N5TFyyCL0ouP4GlW0cZA