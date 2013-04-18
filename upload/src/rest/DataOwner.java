package rest;


/**
 * A simple class for representing a single data owner.
 */
public class DataOwner
{
    public String name;
    public String address;
    public String phone;
    public String email;
    
    /**
     * For construction from JSON.
     */
    DataOwner() {}
    
    public DataOwner(String name, String address, String phone, String email) {
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.email = email;
    }
}
