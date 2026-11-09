# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostStatusConflictEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::PostStatusConflictEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :status, -> { Peal::Types::PostStatus }, optional: false, nullable: false
    end
  end
end
