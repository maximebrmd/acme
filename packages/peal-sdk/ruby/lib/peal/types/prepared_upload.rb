# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PreparedUpload < Internal::Types::Model
      field :media, -> { Peal::Types::Media }, optional: false, nullable: false

      field :upload, -> { Peal::Types::UploadTarget }, optional: false, nullable: false
    end
  end
end
