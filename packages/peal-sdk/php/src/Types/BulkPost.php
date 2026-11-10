<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class BulkPost extends JsonSerializableType
{
    /**
     * @var ?bool $allowDuplicate
     */
    #[JsonProperty('allowDuplicate')]
    public ?bool $allowDuplicate;

    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var ?array<string> $channelSets
     */
    #[JsonProperty('channelSets'), ArrayType(['string'])]
    public ?array $channelSets;

    /**
     * @var PostContent $content
     */
    #[JsonProperty('content')]
    public PostContent $content;

    /**
     * @var ?bool $defaultSignatures
     */
    #[JsonProperty('defaultSignatures')]
    public ?bool $defaultSignatures;

    /**
     * @var ?array<ChannelOptions> $options
     */
    #[JsonProperty('options'), ArrayType([ChannelOptions::class])]
    public ?array $options;

    /**
     * @var ?string $signatureId
     */
    #[JsonProperty('signatureId')]
    public ?string $signatureId;

    /**
     * @var ?array<string> $tagIds
     */
    #[JsonProperty('tagIds'), ArrayType(['string'])]
    public ?array $tagIds;

    /**
     * @var PostTiming $when
     */
    #[JsonProperty('when')]
    public PostTiming $when;

    /**
     * @var ?string $idempotencyKey
     */
    #[JsonProperty('idempotencyKey')]
    public ?string $idempotencyKey;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   content: PostContent,
     *   when: PostTiming,
     *   allowDuplicate?: ?bool,
     *   channelSets?: ?array<string>,
     *   defaultSignatures?: ?bool,
     *   options?: ?array<ChannelOptions>,
     *   signatureId?: ?string,
     *   tagIds?: ?array<string>,
     *   idempotencyKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowDuplicate = $values['allowDuplicate'] ?? null;
        $this->channelIds = $values['channelIds'];
        $this->channelSets = $values['channelSets'] ?? null;
        $this->content = $values['content'];
        $this->defaultSignatures = $values['defaultSignatures'] ?? null;
        $this->options = $values['options'] ?? null;
        $this->signatureId = $values['signatureId'] ?? null;
        $this->tagIds = $values['tagIds'] ?? null;
        $this->when = $values['when'];
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
