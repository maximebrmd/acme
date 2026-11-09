<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ConflictErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'AlreadyMember'
     *   |'TooManyInvitations'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    AlreadyMemberEncoded
     *   |TooManyInvitationsEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'AlreadyMember'
     *   |'TooManyInvitations'
     *   |'_unknown'
     * ),
     *   value: (
     *    AlreadyMemberEncoded
     *   |TooManyInvitationsEncoded
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
     * @param AlreadyMemberEncoded $alreadyMember
     * @return ConflictErrorBody
     */
    public static function alreadyMember(AlreadyMemberEncoded $alreadyMember): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'AlreadyMember',
            'value' => $alreadyMember,
        ]);
    }

    /**
     * @param TooManyInvitationsEncoded $tooManyInvitations
     * @return ConflictErrorBody
     */
    public static function tooManyInvitations(TooManyInvitationsEncoded $tooManyInvitations): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'TooManyInvitations',
            'value' => $tooManyInvitations,
        ]);
    }

    /**
     * @return bool
     */
    public function isAlreadyMember(): bool
    {
        return $this->value instanceof AlreadyMemberEncoded && $this->type === 'AlreadyMember';
    }

    /**
     * @return AlreadyMemberEncoded
     */
    public function asAlreadyMember(): AlreadyMemberEncoded
    {
        if (!($this->value instanceof AlreadyMemberEncoded && $this->type === 'AlreadyMember')) {
            throw new Exception(
                "Expected AlreadyMember; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyInvitations(): bool
    {
        return $this->value instanceof TooManyInvitationsEncoded && $this->type === 'TooManyInvitations';
    }

    /**
     * @return TooManyInvitationsEncoded
     */
    public function asTooManyInvitations(): TooManyInvitationsEncoded
    {
        if (!($this->value instanceof TooManyInvitationsEncoded && $this->type === 'TooManyInvitations')) {
            throw new Exception(
                "Expected TooManyInvitations; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'AlreadyMember':
                $value = $this->asAlreadyMember()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'TooManyInvitations':
                $value = $this->asTooManyInvitations()->jsonSerialize();
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
            case 'AlreadyMember':
                $args['value'] = AlreadyMemberEncoded::jsonDeserialize($data);
                break;
            case 'TooManyInvitations':
                $args['value'] = TooManyInvitationsEncoded::jsonDeserialize($data);
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
