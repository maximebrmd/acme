<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;
use Peal\Types\PostContent;
use Peal\Types\ChannelOptions;
use Peal\Types\PostTiming;

class NewPost extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey
     */
    public ?string $idempotencyKey;

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
     * @param array{
     *   channelIds: array<string>,
     *   content: PostContent,
     *   when: PostTiming,
     *   idempotencyKey?: ?string,
     *   options?: ?array<ChannelOptions>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->channelIds = $values['channelIds'];
        $this->content = $values['content'];
        $this->options = $values['options'] ?? null;
        $this->when = $values['when'];
    }
}
