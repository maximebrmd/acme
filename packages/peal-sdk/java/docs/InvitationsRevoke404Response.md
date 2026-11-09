

# InvitationsRevoke404Response

## anyOf schemas
* [InvitationNotFoundEncoded](InvitationNotFoundEncoded.md)
* [WorkspaceNotFoundEncoded](WorkspaceNotFoundEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.InvitationsRevoke404Response;
import social.peal.model.InvitationNotFoundEncoded;
import social.peal.model.WorkspaceNotFoundEncoded;

public class Example {
    public static void main(String[] args) {
        InvitationsRevoke404Response exampleInvitationsRevoke404Response = new InvitationsRevoke404Response();

        // create a new InvitationNotFoundEncoded
        InvitationNotFoundEncoded exampleInvitationNotFoundEncoded = new InvitationNotFoundEncoded();
        // set InvitationsRevoke404Response to InvitationNotFoundEncoded
        exampleInvitationsRevoke404Response.setActualInstance(exampleInvitationNotFoundEncoded);
        // to get back the InvitationNotFoundEncoded set earlier
        InvitationNotFoundEncoded testInvitationNotFoundEncoded = (InvitationNotFoundEncoded) exampleInvitationsRevoke404Response.getActualInstance();

        // create a new WorkspaceNotFoundEncoded
        WorkspaceNotFoundEncoded exampleWorkspaceNotFoundEncoded = new WorkspaceNotFoundEncoded();
        // set InvitationsRevoke404Response to WorkspaceNotFoundEncoded
        exampleInvitationsRevoke404Response.setActualInstance(exampleWorkspaceNotFoundEncoded);
        // to get back the WorkspaceNotFoundEncoded set earlier
        WorkspaceNotFoundEncoded testWorkspaceNotFoundEncoded = (WorkspaceNotFoundEncoded) exampleInvitationsRevoke404Response.getActualInstance();
    }
}
```


