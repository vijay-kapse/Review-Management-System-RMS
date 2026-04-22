#!/bin/bash
#
# Startup script for a spring boot project
#
# chkconfig: - 84 16
# description: Spring Boot project

# Source function library.
[ -f "/etc/rc.d/init.d/functions" ] && . /etc/rc.d/init.d/functions
[ -z "$JAVA_HOME" -a -x /etc/profile.d/java.sh ] && . /etc/profile.d/java.sh

#set -x

# the name of the project, will also be used for the jar file, log file, ...
PROJECT_NAME=sysreview

# base directory for the spring boot jar
SPRINGBOOTAPP_HOME=/opt/$PROJECT_NAME
export SPRINGBOOTAPP_HOME

# the spring boot jar-file
SPRINGBOOTAPP_JAR="$SPRINGBOOTAPP_HOME/build/libs/$PROJECT_NAME-latest.jar"

#server port to run
#SERVER_PORT=80

# the spring boot jvm args
JVM_ARGS="--spring.config.import=/opt/sysreview/secrets.properties --server.port=${SERVER_PORT:-8080}"

# java executable for spring boot app, change if you have multiple jdks installed
SPRINGBOOTAPP_JAVA=/usr/bin/java

# spring boot log-file
LOG_DIR="$SPRINGBOOTAPP_HOME/logs/"
LOG="$LOG_DIR/$PROJECT_NAME.out"
ERR_LOG="$LOG_DIR/$PROJECT_NAME.err"


LOCK="/var/lock/subsys/$PROJECT_NAME"

RETVAL=0

pid_of_spring_boot() {
    pgrep -f "java.*$PROJECT_NAME"
}

start() {

    echo -n $"Starting $PROJECT_NAME: "

    cd "$SPRINGBOOTAPP_HOME" || exit
    $SPRINGBOOTAPP_JAVA -jar $SPRINGBOOTAPP_JAR $JVM_ARGS >$LOG 2>$ERR_LOG &

    while { pid_of_spring_boot > /dev/null ; } &&
        ! {  [ -f "$LOG" ] && grep -Eq 'Started .*Application in' "$LOG"; } ; do
        sleep 1
    done

    pid_of_spring_boot > /dev/null
    RETVAL=$?
    [ $RETVAL = 0 ] && echo $"$STRING" || echo $"$STRING"
    echo

    [ $RETVAL = 0 ] && touch "$LOCK"
}

stop() {
    echo -n "Stopping $PROJECT_NAME: "

    pid=$(pid_of_spring_boot)
    [ -n "$pid" ] && kill "$pid"
    RETVAL=$?
    cnt=10
    while [ $RETVAL = 0 -a $cnt -gt 0 ] &&
        { pid_of_spring_boot > /dev/null ; } ; do
            sleep 1
            ((cnt--))
    done

    [ $RETVAL = 0 ] && rm -f "$LOCK"
    [ $RETVAL = 0 ] && echo $"$STRING" || echo $"$STRING"
    echo
}

status() {
    pid=$(pid_of_spring_boot)
    if [ -n "$pid" ]; then
        echo "$PROJECT_NAME (pid $pid) is running..."
        return 0
    fi
    if [ -f "$LOCK" ]; then
        echo $"${base} dead but subsys locked"
        return 2
    fi
    echo "$PROJECT_NAME is stopped"
    return 3
}

# See how we were called.
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    restart)
        stop
        start
        ;;
    *)
        echo $"Usage: $0 {start|stop|restart|status}"
        exit 1
esac

exit $RETVAL
