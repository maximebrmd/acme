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
     * @var PostContent $content
     */
    #[JsonProperty('content')]
    public PostContent $content;

    /**
     * @var ?array<ChannelOptions> $options
     */
    #[JsonProperty('options'), ArrayType([ChannelOptions::class])]
    public ?array $options;

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
     *   options?: ?array<ChannelOptions>,
     *   idempotencyKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowDuplicate = $values['allowDuplicate'] ?? null;
        $this->channelIds = $values['channelIds'];
        $this->content = $values['content'];
        $this->options = $values['options'] ?? null;
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
