package rest;

/**
 * Enumerates supported database systems with their JDBC drivers.
 * Needs the driver jars in path.
 */
public enum DBsystem {
	sqlite ("org.sqlite.JDBC"), 
	mysql ("com.mysql.jdbc.Driver"), 
	postgresql ("org.postgresql.Driver");
	
	final String driver;
	
	DBsystem(String driver) {
		this.driver = driver;
	}

}
