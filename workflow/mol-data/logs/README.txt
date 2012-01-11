You can get all the times (I think?) by using this line in bash with cut/grep:
    cat output-j250.txt | grep Result | cut -d : -f8 | cut -d} -f1 > times.txt


