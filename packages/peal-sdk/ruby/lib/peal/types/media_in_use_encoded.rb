# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaInUseEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::MediaInUseEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :post_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "postIds"
    end
  end
end
