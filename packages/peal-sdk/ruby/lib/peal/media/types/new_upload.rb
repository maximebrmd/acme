# frozen_string_literal: true

module Peal
  module Media
    module Types
      class NewUpload < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :alt_text, -> { String }, optional: true, nullable: true, api_name: "altText"

        field :byte_size, -> { Integer }, optional: false, nullable: false, api_name: "byteSize"

        field :content_type, -> { String }, optional: false, nullable: false, api_name: "contentType"

        field :file_name, -> { String }, optional: true, nullable: true, api_name: "fileName"
      end
    end
  end
end
