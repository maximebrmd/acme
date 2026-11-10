# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReplyStatusConflictEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::ReplyStatusConflictEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :status, -> { String }, optional: false, nullable: false
    end
  end
end
