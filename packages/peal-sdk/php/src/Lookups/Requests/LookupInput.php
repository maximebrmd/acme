<?php

namespace Peal\Lookups\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class LookupInput extends JsonSerializableType
{
    /**
     * @var ?string $boardId
     */
    #[JsonProperty('boardId')]
    public ?string $boardId;

    /**
     * @var ?string $cursor
     */
    #[JsonProperty('cursor')]
    public ?string $cursor;

    /**
     * @var ?string $language
     */
    #[JsonProperty('language')]
    public ?string $language;

    /**
     * @var ?int $limit
     */
    #[JsonProperty('limit')]
    public ?int $limit;

    /**
     * @var ?string $regionCode
     */
    #[JsonProperty('regionCode')]
    public ?string $regionCode;

    /**
     * @param array{
     *   boardId?: ?string,
     *   cursor?: ?string,
     *   language?: ?string,
     *   limit?: ?int,
     *   regionCode?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->boardId = $values['boardId'] ?? null;
        $this->cursor = $values['cursor'] ?? null;
        $this->language = $values['language'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->regionCode = $values['regionCode'] ?? null;
    }
}
