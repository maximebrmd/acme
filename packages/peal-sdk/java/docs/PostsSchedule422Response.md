

# PostsSchedule422Response

## anyOf schemas
* [InvalidTimeZoneEncoded](InvalidTimeZoneEncoded.md)
* [PostContentInvalidEncoded](PostContentInvalidEncoded.md)
* [ScheduleInPastEncoded](ScheduleInPastEncoded.md)
* [UnknownChannelsEncoded](UnknownChannelsEncoded.md)
* [UnknownMediaEncoded](UnknownMediaEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.PostsSchedule422Response;
import social.peal.model.InvalidTimeZoneEncoded;
import social.peal.model.PostContentInvalidEncoded;
import social.peal.model.ScheduleInPastEncoded;
import social.peal.model.UnknownChannelsEncoded;
import social.peal.model.UnknownMediaEncoded;

public class Example {
    public static void main(String[] args) {
        PostsSchedule422Response examplePostsSchedule422Response = new PostsSchedule422Response();

        // create a new InvalidTimeZoneEncoded
        InvalidTimeZoneEncoded exampleInvalidTimeZoneEncoded = new InvalidTimeZoneEncoded();
        // set PostsSchedule422Response to InvalidTimeZoneEncoded
        examplePostsSchedule422Response.setActualInstance(exampleInvalidTimeZoneEncoded);
        // to get back the InvalidTimeZoneEncoded set earlier
        InvalidTimeZoneEncoded testInvalidTimeZoneEncoded = (InvalidTimeZoneEncoded) examplePostsSchedule422Response.getActualInstance();

        // create a new PostContentInvalidEncoded
        PostContentInvalidEncoded examplePostContentInvalidEncoded = new PostContentInvalidEncoded();
        // set PostsSchedule422Response to PostContentInvalidEncoded
        examplePostsSchedule422Response.setActualInstance(examplePostContentInvalidEncoded);
        // to get back the PostContentInvalidEncoded set earlier
        PostContentInvalidEncoded testPostContentInvalidEncoded = (PostContentInvalidEncoded) examplePostsSchedule422Response.getActualInstance();

        // create a new ScheduleInPastEncoded
        ScheduleInPastEncoded exampleScheduleInPastEncoded = new ScheduleInPastEncoded();
        // set PostsSchedule422Response to ScheduleInPastEncoded
        examplePostsSchedule422Response.setActualInstance(exampleScheduleInPastEncoded);
        // to get back the ScheduleInPastEncoded set earlier
        ScheduleInPastEncoded testScheduleInPastEncoded = (ScheduleInPastEncoded) examplePostsSchedule422Response.getActualInstance();

        // create a new UnknownChannelsEncoded
        UnknownChannelsEncoded exampleUnknownChannelsEncoded = new UnknownChannelsEncoded();
        // set PostsSchedule422Response to UnknownChannelsEncoded
        examplePostsSchedule422Response.setActualInstance(exampleUnknownChannelsEncoded);
        // to get back the UnknownChannelsEncoded set earlier
        UnknownChannelsEncoded testUnknownChannelsEncoded = (UnknownChannelsEncoded) examplePostsSchedule422Response.getActualInstance();

        // create a new UnknownMediaEncoded
        UnknownMediaEncoded exampleUnknownMediaEncoded = new UnknownMediaEncoded();
        // set PostsSchedule422Response to UnknownMediaEncoded
        examplePostsSchedule422Response.setActualInstance(exampleUnknownMediaEncoded);
        // to get back the UnknownMediaEncoded set earlier
        UnknownMediaEncoded testUnknownMediaEncoded = (UnknownMediaEncoded) examplePostsSchedule422Response.getActualInstance();
    }
}
```


