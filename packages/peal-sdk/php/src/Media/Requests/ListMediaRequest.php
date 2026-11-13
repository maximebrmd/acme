<?php

namespace Peal\Media\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\MediaKind;

class ListMediaRequest extends JsonSerializableType
{
    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?value-of<MediaKind> $kind
     */
    public ?string $kind;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?string $q
     */
    public ?string $q;

    /**
     * @param array{
     *   cursor?: ?string,
     *   kind?: ?value-of<MediaKind>,
     *   limit?: ?string,
     *   q?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->kind = $values['kind'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->q = $values['q'] ?? null;
    }
}
