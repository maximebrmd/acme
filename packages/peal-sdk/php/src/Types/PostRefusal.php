<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class PostRefusal extends JsonSerializableType
{
    /**
     * @var (
     *    'PostContentInvalid'
     *   |'UnknownChannels'
     *   |'UnknownMedia'
     *   |'ScheduleInPast'
     *   |'InvalidTimeZone'
     *   |'PlanLimitReached'
     *   |'IdempotencyKeyReused'
     *   |'PostNotFound'
     *   |'DuplicatePost'
     *   |'Forbidden'
     *   |'UnknownTags'
     *   |'ChannelSetNotFound'
     *   |'SignatureNotFound'
     *   |'QueueNotFound'
     *   |'QueueHasNoRoom'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    PostContentInvalidEncoded
     *   |UnknownChannelsEncoded
     *   |UnknownMediaEncoded
     *   |ScheduleInPastEncoded
     *   |InvalidTimeZoneEncoded
     *   |PlanLimitReachedEncoded
     *   |IdempotencyKeyReusedEncoded
     *   |PostNotFoundEncoded
     *   |DuplicatePostEncoded
     *   |ForbiddenEncoded
     *   |UnknownTagsEncoded
     *   |ChannelSetNotFoundEncoded
     *   |SignatureNotFoundEncoded
     *   |QueueNotFoundEncoded
     *   |QueueHasNoRoomEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'PostContentInvalid'
     *   |'UnknownChannels'
     *   |'UnknownMedia'
     *   |'ScheduleInPast'
     *   |'InvalidTimeZone'
     *   |'PlanLimitReached'
     *   |'IdempotencyKeyReused'
     *   |'PostNotFound'
     *   |'DuplicatePost'
     *   |'Forbidden'
     *   |'UnknownTags'
     *   |'ChannelSetNotFound'
     *   |'SignatureNotFound'
     *   |'QueueNotFound'
     *   |'QueueHasNoRoom'
     *   |'_unknown'
     * ),
     *   value: (
     *    PostContentInvalidEncoded
     *   |UnknownChannelsEncoded
     *   |UnknownMediaEncoded
     *   |ScheduleInPastEncoded
     *   |InvalidTimeZoneEncoded
     *   |PlanLimitReachedEncoded
     *   |IdempotencyKeyReusedEncoded
     *   |PostNotFoundEncoded
     *   |DuplicatePostEncoded
     *   |ForbiddenEncoded
     *   |UnknownTagsEncoded
     *   |ChannelSetNotFoundEncoded
     *   |SignatureNotFoundEncoded
     *   |QueueNotFoundEncoded
     *   |QueueHasNoRoomEncoded
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->value = $values['value'];
    }

    /**
     * @param PostContentInvalidEncoded $postContentInvalid
     * @return PostRefusal
     */
    public static function postContentInvalid(PostContentInvalidEncoded $postContentInvalid): PostRefusal
    {
        return new PostRefusal([
            'type' => 'PostContentInvalid',
            'value' => $postContentInvalid,
        ]);
    }

    /**
     * @param UnknownChannelsEncoded $unknownChannels
     * @return PostRefusal
     */
    public static function unknownChannels(UnknownChannelsEncoded $unknownChannels): PostRefusal
    {
        return new PostRefusal([
            'type' => 'UnknownChannels',
            'value' => $unknownChannels,
        ]);
    }

    /**
     * @param UnknownMediaEncoded $unknownMedia
     * @return PostRefusal
     */
    public static function unknownMedia(UnknownMediaEncoded $unknownMedia): PostRefusal
    {
        return new PostRefusal([
            'type' => 'UnknownMedia',
            'value' => $unknownMedia,
        ]);
    }

    /**
     * @param ScheduleInPastEncoded $scheduleInPast
     * @return PostRefusal
     */
    public static function scheduleInPast(ScheduleInPastEncoded $scheduleInPast): PostRefusal
    {
        return new PostRefusal([
            'type' => 'ScheduleInPast',
            'value' => $scheduleInPast,
        ]);
    }

    /**
     * @param InvalidTimeZoneEncoded $invalidTimeZone
     * @return PostRefusal
     */
    public static function invalidTimeZone(InvalidTimeZoneEncoded $invalidTimeZone): PostRefusal
    {
        return new PostRefusal([
            'type' => 'InvalidTimeZone',
            'value' => $invalidTimeZone,
        ]);
    }

    /**
     * @param PlanLimitReachedEncoded $planLimitReached
     * @return PostRefusal
     */
    public static function planLimitReached(PlanLimitReachedEncoded $planLimitReached): PostRefusal
    {
        return new PostRefusal([
            'type' => 'PlanLimitReached',
            'value' => $planLimitReached,
        ]);
    }

    /**
     * @param IdempotencyKeyReusedEncoded $idempotencyKeyReused
     * @return PostRefusal
     */
    public static function idempotencyKeyReused(IdempotencyKeyReusedEncoded $idempotencyKeyReused): PostRefusal
    {
        return new PostRefusal([
            'type' => 'IdempotencyKeyReused',
            'value' => $idempotencyKeyReused,
        ]);
    }

    /**
     * @param PostNotFoundEncoded $postNotFound
     * @return PostRefusal
     */
    public static function postNotFound(PostNotFoundEncoded $postNotFound): PostRefusal
    {
        return new PostRefusal([
            'type' => 'PostNotFound',
            'value' => $postNotFound,
        ]);
    }

    /**
     * @param DuplicatePostEncoded $duplicatePost
     * @return PostRefusal
     */
    public static function duplicatePost(DuplicatePostEncoded $duplicatePost): PostRefusal
    {
        return new PostRefusal([
            'type' => 'DuplicatePost',
            'value' => $duplicatePost,
        ]);
    }

    /**
     * @param ForbiddenEncoded $forbidden
     * @return PostRefusal
     */
    public static function forbidden(ForbiddenEncoded $forbidden): PostRefusal
    {
        return new PostRefusal([
            'type' => 'Forbidden',
            'value' => $forbidden,
        ]);
    }

    /**
     * @param UnknownTagsEncoded $unknownTags
     * @return PostRefusal
     */
    public static function unknownTags(UnknownTagsEncoded $unknownTags): PostRefusal
    {
        return new PostRefusal([
            'type' => 'UnknownTags',
            'value' => $unknownTags,
        ]);
    }

    /**
     * @param ChannelSetNotFoundEncoded $channelSetNotFound
     * @return PostRefusal
     */
    public static function channelSetNotFound(ChannelSetNotFoundEncoded $channelSetNotFound): PostRefusal
    {
        return new PostRefusal([
            'type' => 'ChannelSetNotFound',
            'value' => $channelSetNotFound,
        ]);
    }

    /**
     * @param SignatureNotFoundEncoded $signatureNotFound
     * @return PostRefusal
     */
    public static function signatureNotFound(SignatureNotFoundEncoded $signatureNotFound): PostRefusal
    {
        return new PostRefusal([
            'type' => 'SignatureNotFound',
            'value' => $signatureNotFound,
        ]);
    }

    /**
     * @param QueueNotFoundEncoded $queueNotFound
     * @return PostRefusal
     */
    public static function queueNotFound(QueueNotFoundEncoded $queueNotFound): PostRefusal
    {
        return new PostRefusal([
            'type' => 'QueueNotFound',
            'value' => $queueNotFound,
        ]);
    }

    /**
     * @param QueueHasNoRoomEncoded $queueHasNoRoom
     * @return PostRefusal
     */
    public static function queueHasNoRoom(QueueHasNoRoomEncoded $queueHasNoRoom): PostRefusal
    {
        return new PostRefusal([
            'type' => 'QueueHasNoRoom',
            'value' => $queueHasNoRoom,
        ]);
    }

    /**
     * @return bool
     */
    public function isPostContentInvalid(): bool
    {
        return $this->value instanceof PostContentInvalidEncoded && $this->type === 'PostContentInvalid';
    }

    /**
     * @return PostContentInvalidEncoded
     */
    public function asPostContentInvalid(): PostContentInvalidEncoded
    {
        if (!($this->value instanceof PostContentInvalidEncoded && $this->type === 'PostContentInvalid')) {
            throw new Exception(
                "Expected PostContentInvalid; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isUnknownChannels(): bool
    {
        return $this->value instanceof UnknownChannelsEncoded && $this->type === 'UnknownChannels';
    }

    /**
     * @return UnknownChannelsEncoded
     */
    public function asUnknownChannels(): UnknownChannelsEncoded
    {
        if (!($this->value instanceof UnknownChannelsEncoded && $this->type === 'UnknownChannels')) {
            throw new Exception(
                "Expected UnknownChannels; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isUnknownMedia(): bool
    {
        return $this->value instanceof UnknownMediaEncoded && $this->type === 'UnknownMedia';
    }

    /**
     * @return UnknownMediaEncoded
     */
    public function asUnknownMedia(): UnknownMediaEncoded
    {
        if (!($this->value instanceof UnknownMediaEncoded && $this->type === 'UnknownMedia')) {
            throw new Exception(
                "Expected UnknownMedia; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isScheduleInPast(): bool
    {
        return $this->value instanceof ScheduleInPastEncoded && $this->type === 'ScheduleInPast';
    }

    /**
     * @return ScheduleInPastEncoded
     */
    public function asScheduleInPast(): ScheduleInPastEncoded
    {
        if (!($this->value instanceof ScheduleInPastEncoded && $this->type === 'ScheduleInPast')) {
            throw new Exception(
                "Expected ScheduleInPast; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isInvalidTimeZone(): bool
    {
        return $this->value instanceof InvalidTimeZoneEncoded && $this->type === 'InvalidTimeZone';
    }

    /**
     * @return InvalidTimeZoneEncoded
     */
    public function asInvalidTimeZone(): InvalidTimeZoneEncoded
    {
        if (!($this->value instanceof InvalidTimeZoneEncoded && $this->type === 'InvalidTimeZone')) {
            throw new Exception(
                "Expected InvalidTimeZone; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPlanLimitReached(): bool
    {
        return $this->value instanceof PlanLimitReachedEncoded && $this->type === 'PlanLimitReached';
    }

    /**
     * @return PlanLimitReachedEncoded
     */
    public function asPlanLimitReached(): PlanLimitReachedEncoded
    {
        if (!($this->value instanceof PlanLimitReachedEncoded && $this->type === 'PlanLimitReached')) {
            throw new Exception(
                "Expected PlanLimitReached; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isIdempotencyKeyReused(): bool
    {
        return $this->value instanceof IdempotencyKeyReusedEncoded && $this->type === 'IdempotencyKeyReused';
    }

    /**
     * @return IdempotencyKeyReusedEncoded
     */
    public function asIdempotencyKeyReused(): IdempotencyKeyReusedEncoded
    {
        if (!($this->value instanceof IdempotencyKeyReusedEncoded && $this->type === 'IdempotencyKeyReused')) {
            throw new Exception(
                "Expected IdempotencyKeyReused; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostNotFound(): bool
    {
        return $this->value instanceof PostNotFoundEncoded && $this->type === 'PostNotFound';
    }

    /**
     * @return PostNotFoundEncoded
     */
    public function asPostNotFound(): PostNotFoundEncoded
    {
        if (!($this->value instanceof PostNotFoundEncoded && $this->type === 'PostNotFound')) {
            throw new Exception(
                "Expected PostNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isDuplicatePost(): bool
    {
        return $this->value instanceof DuplicatePostEncoded && $this->type === 'DuplicatePost';
    }

    /**
     * @return DuplicatePostEncoded
     */
    public function asDuplicatePost(): DuplicatePostEncoded
    {
        if (!($this->value instanceof DuplicatePostEncoded && $this->type === 'DuplicatePost')) {
            throw new Exception(
                "Expected DuplicatePost; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isForbidden(): bool
    {
        return $this->value instanceof ForbiddenEncoded && $this->type === 'Forbidden';
    }

    /**
     * @return ForbiddenEncoded
     */
    public function asForbidden(): ForbiddenEncoded
    {
        if (!($this->value instanceof ForbiddenEncoded && $this->type === 'Forbidden')) {
            throw new Exception(
                "Expected Forbidden; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isUnknownTags(): bool
    {
        return $this->value instanceof UnknownTagsEncoded && $this->type === 'UnknownTags';
    }

    /**
     * @return UnknownTagsEncoded
     */
    public function asUnknownTags(): UnknownTagsEncoded
    {
        if (!($this->value instanceof UnknownTagsEncoded && $this->type === 'UnknownTags')) {
            throw new Exception(
                "Expected UnknownTags; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isChannelSetNotFound(): bool
    {
        return $this->value instanceof ChannelSetNotFoundEncoded && $this->type === 'ChannelSetNotFound';
    }

    /**
     * @return ChannelSetNotFoundEncoded
     */
    public function asChannelSetNotFound(): ChannelSetNotFoundEncoded
    {
        if (!($this->value instanceof ChannelSetNotFoundEncoded && $this->type === 'ChannelSetNotFound')) {
            throw new Exception(
                "Expected ChannelSetNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isSignatureNotFound(): bool
    {
        return $this->value instanceof SignatureNotFoundEncoded && $this->type === 'SignatureNotFound';
    }

    /**
     * @return SignatureNotFoundEncoded
     */
    public function asSignatureNotFound(): SignatureNotFoundEncoded
    {
        if (!($this->value instanceof SignatureNotFoundEncoded && $this->type === 'SignatureNotFound')) {
            throw new Exception(
                "Expected SignatureNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isQueueNotFound(): bool
    {
        return $this->value instanceof QueueNotFoundEncoded && $this->type === 'QueueNotFound';
    }

    /**
     * @return QueueNotFoundEncoded
     */
    public function asQueueNotFound(): QueueNotFoundEncoded
    {
        if (!($this->value instanceof QueueNotFoundEncoded && $this->type === 'QueueNotFound')) {
            throw new Exception(
                "Expected QueueNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isQueueHasNoRoom(): bool
    {
        return $this->value instanceof QueueHasNoRoomEncoded && $this->type === 'QueueHasNoRoom';
    }

    /**
     * @return QueueHasNoRoomEncoded
     */
    public function asQueueHasNoRoom(): QueueHasNoRoomEncoded
    {
        if (!($this->value instanceof QueueHasNoRoomEncoded && $this->type === 'QueueHasNoRoom')) {
            throw new Exception(
                "Expected QueueHasNoRoom; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }

    /**
     * @return array<mixed>
     */
    public function jsonSerialize(): array
    {
        $result = [];
        $result['_tag'] = $this->type;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->type) {
            case 'PostContentInvalid':
                $value = $this->asPostContentInvalid()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'UnknownChannels':
                $value = $this->asUnknownChannels()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'UnknownMedia':
                $value = $this->asUnknownMedia()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ScheduleInPast':
                $value = $this->asScheduleInPast()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'InvalidTimeZone':
                $value = $this->asInvalidTimeZone()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PlanLimitReached':
                $value = $this->asPlanLimitReached()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'IdempotencyKeyReused':
                $value = $this->asIdempotencyKeyReused()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostNotFound':
                $value = $this->asPostNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'DuplicatePost':
                $value = $this->asDuplicatePost()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'Forbidden':
                $value = $this->asForbidden()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'UnknownTags':
                $value = $this->asUnknownTags()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ChannelSetNotFound':
                $value = $this->asChannelSetNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'SignatureNotFound':
                $value = $this->asSignatureNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'QueueNotFound':
                $value = $this->asQueueNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'QueueHasNoRoom':
                $value = $this->asQueueHasNoRoom()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case '_unknown':
            default:
                if (is_null($this->value)) {
                    break;
                }
                if ($this->value instanceof JsonSerializableType) {
                    $value = $this->value->jsonSerialize();
                    $result = array_merge($value, $result);
                } elseif (is_array($this->value)) {
                    $result = array_merge($this->value, $result);
                }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function jsonDeserialize(array $data): static
    {
        $args = [];
        if (!array_key_exists('_tag', $data)) {
            throw new Exception(
                "JSON data is missing property '_tag'",
            );
        }
        $type = $data['_tag'];
        if (!(is_string($type))) {
            throw new Exception(
                "Expected property 'type' in JSON data to be string, instead received " . get_debug_type($data['_tag']),
            );
        }

        $args['type'] = $type;
        switch ($type) {
            case 'PostContentInvalid':
                $args['value'] = PostContentInvalidEncoded::jsonDeserialize($data);
                break;
            case 'UnknownChannels':
                $args['value'] = UnknownChannelsEncoded::jsonDeserialize($data);
                break;
            case 'UnknownMedia':
                $args['value'] = UnknownMediaEncoded::jsonDeserialize($data);
                break;
            case 'ScheduleInPast':
                $args['value'] = ScheduleInPastEncoded::jsonDeserialize($data);
                break;
            case 'InvalidTimeZone':
                $args['value'] = InvalidTimeZoneEncoded::jsonDeserialize($data);
                break;
            case 'PlanLimitReached':
                $args['value'] = PlanLimitReachedEncoded::jsonDeserialize($data);
                break;
            case 'IdempotencyKeyReused':
                $args['value'] = IdempotencyKeyReusedEncoded::jsonDeserialize($data);
                break;
            case 'PostNotFound':
                $args['value'] = PostNotFoundEncoded::jsonDeserialize($data);
                break;
            case 'DuplicatePost':
                $args['value'] = DuplicatePostEncoded::jsonDeserialize($data);
                break;
            case 'Forbidden':
                $args['value'] = ForbiddenEncoded::jsonDeserialize($data);
                break;
            case 'UnknownTags':
                $args['value'] = UnknownTagsEncoded::jsonDeserialize($data);
                break;
            case 'ChannelSetNotFound':
                $args['value'] = ChannelSetNotFoundEncoded::jsonDeserialize($data);
                break;
            case 'SignatureNotFound':
                $args['value'] = SignatureNotFoundEncoded::jsonDeserialize($data);
                break;
            case 'QueueNotFound':
                $args['value'] = QueueNotFoundEncoded::jsonDeserialize($data);
                break;
            case 'QueueHasNoRoom':
                $args['value'] = QueueHasNoRoomEncoded::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['type'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
