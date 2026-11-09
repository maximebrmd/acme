# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class DatabaseUnavailableEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::DatabaseUnavailableEncodedTag }, optional: false, nullable: false, api_name: "_tag"
    end
  end
end
