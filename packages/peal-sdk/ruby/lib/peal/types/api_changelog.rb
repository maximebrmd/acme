# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class APIChangelog < Internal::Types::Model
      field :entries, -> { Internal::Types::Array[Peal::Types::APIChangelogEntry] }, optional: false, nullable: false
    end
  end
end
