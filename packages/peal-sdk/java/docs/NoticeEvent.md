

# NoticeEvent

## anyOf schemas
* [NoticeEventAnyOf](NoticeEventAnyOf.md)
* [NoticeEventAnyOf1](NoticeEventAnyOf1.md)
* [NoticeEventAnyOf2](NoticeEventAnyOf2.md)
* [NoticeEventAnyOf3](NoticeEventAnyOf3.md)
* [NoticeEventAnyOf4](NoticeEventAnyOf4.md)

## Example
```java
// Import classes:
import social.peal.model.NoticeEvent;
import social.peal.model.NoticeEventAnyOf;
import social.peal.model.NoticeEventAnyOf1;
import social.peal.model.NoticeEventAnyOf2;
import social.peal.model.NoticeEventAnyOf3;
import social.peal.model.NoticeEventAnyOf4;

public class Example {
    public static void main(String[] args) {
        NoticeEvent exampleNoticeEvent = new NoticeEvent();

        // create a new NoticeEventAnyOf
        NoticeEventAnyOf exampleNoticeEventAnyOf = new NoticeEventAnyOf();
        // set NoticeEvent to NoticeEventAnyOf
        exampleNoticeEvent.setActualInstance(exampleNoticeEventAnyOf);
        // to get back the NoticeEventAnyOf set earlier
        NoticeEventAnyOf testNoticeEventAnyOf = (NoticeEventAnyOf) exampleNoticeEvent.getActualInstance();

        // create a new NoticeEventAnyOf1
        NoticeEventAnyOf1 exampleNoticeEventAnyOf1 = new NoticeEventAnyOf1();
        // set NoticeEvent to NoticeEventAnyOf1
        exampleNoticeEvent.setActualInstance(exampleNoticeEventAnyOf1);
        // to get back the NoticeEventAnyOf1 set earlier
        NoticeEventAnyOf1 testNoticeEventAnyOf1 = (NoticeEventAnyOf1) exampleNoticeEvent.getActualInstance();

        // create a new NoticeEventAnyOf2
        NoticeEventAnyOf2 exampleNoticeEventAnyOf2 = new NoticeEventAnyOf2();
        // set NoticeEvent to NoticeEventAnyOf2
        exampleNoticeEvent.setActualInstance(exampleNoticeEventAnyOf2);
        // to get back the NoticeEventAnyOf2 set earlier
        NoticeEventAnyOf2 testNoticeEventAnyOf2 = (NoticeEventAnyOf2) exampleNoticeEvent.getActualInstance();

        // create a new NoticeEventAnyOf3
        NoticeEventAnyOf3 exampleNoticeEventAnyOf3 = new NoticeEventAnyOf3();
        // set NoticeEvent to NoticeEventAnyOf3
        exampleNoticeEvent.setActualInstance(exampleNoticeEventAnyOf3);
        // to get back the NoticeEventAnyOf3 set earlier
        NoticeEventAnyOf3 testNoticeEventAnyOf3 = (NoticeEventAnyOf3) exampleNoticeEvent.getActualInstance();

        // create a new NoticeEventAnyOf4
        NoticeEventAnyOf4 exampleNoticeEventAnyOf4 = new NoticeEventAnyOf4();
        // set NoticeEvent to NoticeEventAnyOf4
        exampleNoticeEvent.setActualInstance(exampleNoticeEventAnyOf4);
        // to get back the NoticeEventAnyOf4 set earlier
        NoticeEventAnyOf4 testNoticeEventAnyOf4 = (NoticeEventAnyOf4) exampleNoticeEvent.getActualInstance();
    }
}
```


