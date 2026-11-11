<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class LivePostEdit extends JsonSerializableType
{
    /**
     * @var ?string $wait
     */
    public ?string $wait;

    /**
     * @var ?int $part
     */
    #[JsonProperty('part')]
    public ?int $part;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   text: string,
     *   wait?: ?string,
     *   part?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->wait = $values['wait'] ?? null;
        $this->part = $values['part'] ?? null;
        $this->text = $values['text'];
    }
}
