# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AdAuditEntryByKind
      extend Peal::Internal::Types::Enum

      USER = "user"
      API_KEY = "apiKey"
    end
  end
end
