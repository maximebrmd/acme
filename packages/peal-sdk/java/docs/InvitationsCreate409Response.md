

# InvitationsCreate409Response

## anyOf schemas
* [AlreadyMemberEncoded](AlreadyMemberEncoded.md)
* [TooManyInvitationsEncoded](TooManyInvitationsEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.InvitationsCreate409Response;
import social.peal.model.AlreadyMemberEncoded;
import social.peal.model.TooManyInvitationsEncoded;

public class Example {
    public static void main(String[] args) {
        InvitationsCreate409Response exampleInvitationsCreate409Response = new InvitationsCreate409Response();

        // create a new AlreadyMemberEncoded
        AlreadyMemberEncoded exampleAlreadyMemberEncoded = new AlreadyMemberEncoded();
        // set InvitationsCreate409Response to AlreadyMemberEncoded
        exampleInvitationsCreate409Response.setActualInstance(exampleAlreadyMemberEncoded);
        // to get back the AlreadyMemberEncoded set earlier
        AlreadyMemberEncoded testAlreadyMemberEncoded = (AlreadyMemberEncoded) exampleInvitationsCreate409Response.getActualInstance();

        // create a new TooManyInvitationsEncoded
        TooManyInvitationsEncoded exampleTooManyInvitationsEncoded = new TooManyInvitationsEncoded();
        // set InvitationsCreate409Response to TooManyInvitationsEncoded
        exampleInvitationsCreate409Response.setActualInstance(exampleTooManyInvitationsEncoded);
        // to get back the TooManyInvitationsEncoded set earlier
        TooManyInvitationsEncoded testTooManyInvitationsEncoded = (TooManyInvitationsEncoded) exampleInvitationsCreate409Response.getActualInstance();
    }
}
```


