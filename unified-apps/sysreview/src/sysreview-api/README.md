# Read Me First

# Getting Started

## Installation

1. [x] JDK (8 and above)
2. [x] Postgresql
3. [x] Git _(optional)_

## Dependent tools and frameworks used

1. [ ] Spring
2. [ ] Springboot
3. [ ] Gradle

## How to run this project?

1. Install JDK from [here](https://www.oracle.com/java/technologies/downloads/ )<br>
   **_Note: You can also install other variants of JDK like OpenJDK/Azul/Red Hat etc. instead of Oracle's_**
2. Setup postgresql on your system or remote platform, more details: [here](https://www.postgresql.org)
    1. Create a database as per value configured in [application.properties](src/main/resources/application.properties)
       for property `spring.datasource.name`
    2. Create a file `secrets.properties` for storing confidential properties like shared secrets/credentials etc.
       within this [directory](src/main/resources)
    3. Refer this [template](src/main/resources/secrets.properties.template) and configure database login credential,
       jwt related security configurations and API key value within file created from above step
3. Clone this project
4. Open a terminal or command prompt and change directory to the `research-survey-extractor-api` directory

```agsl
cd research-survey-extractor-api
```

5. Now build the project
    1. By running below command if you're on a windows based system
   ```agsl
   .\gradlew.bat build
    ```
    2. Else run below command if you're using unix based system
   ```agsl
   ./gradlew build
   ```
6. Run the springboot application using below command:

```agsl
java -jar build/libs/research-survey-extractor-api-1.0.jar
```

Note: If the above jar doesn't exist, probably the version might have changed, replace with the jar having similar name
pattern that is present on relative path: `build/libs`

1. Once the server is up, then you shall find a message similar to this:

```agsl
Started SysReviewApplication in x.xxx seconds
```